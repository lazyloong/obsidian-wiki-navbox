import {
    App,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile,
    WorkspaceLeaf,
    Component,
    MarkdownRenderer,
    Keymap,
    UserEvent,
} from "obsidian";
import { getAPI, DataviewApi } from "obsidian-dataview";

interface TheSettings {
    mySetting: string;
}
const DEFAULT_SETTINGS: TheSettings = {
    mySetting: "default",
};
export default class ThePlugin extends Plugin {
    settings: TheSettings;
    navboxs: Navbox[];
    leafs: WorkspaceLeaf[];
    navboxFiles: TFile[];
    dv: DataviewApi;
    rootPath: string;
    regex: RegExp;
    async onload() {
        await this.loadSettings();
        this.dv = getAPI(this.app);
        this.rootPath = this.app.vault.adapter.getBasePath();
        this.regex = /\[\[(.+?)(#.*?)?(\|.*?)?\]\]/;
        this.navboxFiles = this.app.vault
            .getMarkdownFiles()
            .filter((f) => this.app.metadataCache.getFileCache(f).frontmatter?.navbox);
        this.navboxs = await Promise.all(
            this.navboxFiles.map((f) => TFile2Navbox(f, this.regex, this.app, this))
        );

        let leafs = this.app.workspace.getLeavesOfType("markdown");
        this.updateLeafs(leafs);
        this.registerEvent(
            this.app.workspace.on("file-open", () => {
                let leafs = this.app.workspace.getLeavesOfType("markdown");
                this.updateLeafs(leafs);
            })
        );
        // this.registerEvent(
        //     this.app.workspace.on("active-leaf-change", (leaf) => {
        //         console.log("aaa");
        //         this.updateViews([leaf]);
        //     })
        // );
        this.registerEvent(
            this.app.metadataCache.on("dataview:metadata-change", (type, file) => {
                this.updateFiles(file);
            })
        );
        // this.addCommand({
        //     id: "navbox-toggle",
        //     name: "Toggle Navbox",
        //     checkCallback: (checking: boolean) => {
        //         if (!checking) {
        //             this.leafs = this.app.workspace.getLeavesOfType("markdown");
        //             this.leafs.forEach((leaf) => {
        //                 let sizer = leaf.view.containerEl.querySelector(".cm-sizer");
        //                 this.navboxs[0].render(sizer, (leaf.view as any)?.file);
        //             });
        //         }
        //     },
        // });
        // this.addSettingTab(new TheSettingTab(this.app, this));
    }
    async updateFiles(file: TFile) {
        if (this.navboxFiles.includes(file)) {
            this.navboxFiles = this.app.vault
                .getMarkdownFiles()
                .filter((f) => this.app.metadataCache.getFileCache(f).frontmatter?.navbox);
            this.navboxs = await Promise.all(
                this.navboxFiles.map((f) => TFile2Navbox(f, this.regex, this.app, this))
            );
        } else if (this.app.metadataCache.getFileCache(file).frontmatter?.navbox) {
            this.navboxFiles.push(file);
            this.navboxs.push(await TFile2Navbox(file, this.regex, this.app, this));
        }
    }
    updateLeafs(leafs) {
        leafs.forEach((l) => {
            let file = l.view.file;
            let navboxs = this.navboxs.filter((n) => n.outlinks.includes(file.path));
            let mode = l.view.getMode();
            let class_ = mode == "source" ? ".cm-sizer" : ".mod-footer";
            let el = l.view.containerEl.querySelector(class_) as HTMLElement;
            // let modfooter = l.view.containerEl.querySelector(".mod-footer") as HTMLElement;
            let div = el.querySelector(".navbox-div") as HTMLElement;
            if (!div) div = el.createEl("div", { cls: "navbox-div" });
            div.empty();
            navboxs.forEach((n) => n.render(div, file.path));
        });
    }
    onunload() {}
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class TheSettingTab extends PluginSettingTab {
    plugin: ThePlugin;
    constructor(app: App, plugin: ThePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display(): void {
        let { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Settings for my awesome plugin." });
        new Setting(containerEl)
            .setName("Setting #1")
            .setDesc("It's a secret")
            .addText((text) =>
                text
                    .setPlaceholder("Enter your secret")
                    .setValue("")
                    .onChange(async (value) => {
                        console.log("Secret: " + value);
                        this.plugin.settings.mySetting = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}

class Navbox extends Component {
    plugin: ThePlugin;
    app: App;
    file: TFile;
    listItems: ListItem[];
    tableEl: HTMLDivElement;
    outlinks: string[];
    regex: RegExp;
    title: string;
    constructor(app: App, plugin: ThePlugin, listItem: ListItem[], file: TFile) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.file = file;
        this.listItems = listItem;
        this.outlinks = this.listItems.map((p) => p.outlinks).flat();
        let navbox = this.app.metadataCache.getFileCache(file).frontmatter?.navbox;
        this.title = typeof navbox == "string" ? navbox : this.file.basename;
    }
    render(root: HTMLElement, path: string) {
        this.tableEl = root.createEl("div", { cls: "wiki-navbox" });
        let table = this.tableEl.createEl("table");
        table.createTHead();
        table.createTBody();
        let tr = table.tHead.insertRow();
        let th = tr.createEl("th");
        th.colSpan = 2;
        th.style.fontWeight = "700";
        MarkdownRenderer.render(
            this.app,
            `[[${this.file.basename}|${this.title}]]`,
            th,
            this.plugin.rootPath + "/" + this.file.path,
            null
        );
        let a = th.querySelector("a.internal-link") as HTMLElement;
        clickOpenFile(a, this.file, "", this.plugin);

        this.listItems.forEach(async (listItem) => {
            let text = listItem.children
                .map((p) =>
                    p.path == path
                        ? `**${p.display ?? p.name}**`
                        : `[[${p.name}|${p.display ?? p.name}]]`
                )
                .filter((p) => p);
            if (text.length == 0) return;

            tr = table.tBodies[0].insertRow();
            let td = tr.createEl("td");
            MarkdownRenderer.render(
                this.app,
                listItem.title,
                td,
                this.plugin.rootPath + "/" + this.file.path,
                null
            );
            let a1 = td.querySelector("a.internal-link") as HTMLElement;
            let file = Text2TFile(listItem.title, this.plugin.regex, this.app, this.file);
            if(a1) clickOpenFile(a1, file, file.basename, this.plugin);

            td = tr.createEl("td");
            await MarkdownRenderer.render(
                this.app,
                text.join(' <span style="font-weight: 700">·</span> '),
                td,
                this.plugin.rootPath + "/" + this.file.path,
                null
            );
            let a2 = td.querySelectorAll("a.internal-link") as NodeListOf<HTMLElement>;
            a2.forEach((p) => {
                let name = p.getAttribute("data-href");
                let children = listItem.children.find((p) => p.name == name);
                clickOpenFile(p, children.file, children.linkText, this.plugin);
            });
        });
    }
}

function clickOpenFile(el: HTMLElement, file: TFile, linkText: string, plugin: ThePlugin) {
    if (linkText.includes("#"))
        el.addEventListener("click", (e) => {
            let m = Keymap.isModEvent(e as UserEvent);
            if (m) plugin.app.workspace.getLeaf(m).openLinkText(linkText, file.path, null);
            else plugin.app.workspace.getMostRecentLeaf().openLinkText(linkText, file.path, null);
        });
    else
        el.addEventListener("click", (e) => {
            let m = Keymap.isModEvent(e as UserEvent);
            if (m) plugin.app.workspace.getLeaf(m).openFile(file);
            else plugin.app.workspace.getMostRecentLeaf().openFile(file);
        });
}

type ListItem = {
    title: string;
    file: TFile;
    path: string;
    outlinks: string[];
    children: ListItemChildren[];
};

type ListItemChildren = {
    name: string;
    file: TFile;
    path: string;
    display?: string;
    linkText: string;
};

async function TFile2Navbox(
    file: TFile,
    regex: RegExp,
    app: App,
    plugin: ThePlugin
): Promise<Navbox> {
    let content = await app.vault.cachedRead(file),
        lines = content.split("\n"),
        dv = plugin.dv,
        dfile = dv.page(file.path),
        lists = dfile.file.lists.groupBy((p) => p.list),
        listItems: ListItem[] = [],
        headers = app.metadataCache.getFileCache(file)?.headings;
    for (let i = 0; i < lists.length; i++) {
        let list: any[] = lists[i].rows.array();
        if (list.some((p) => p.children.length != 0)) {
            listItems = listItems.concat(
                list
                    .filter((p) => !p?.parent)
                    .map((p) => {
                        let children: ListItemChildren[] = p.children
                            .map((c) => Text2ListItemChildren(c.text, regex, app, file))
                            .filter((p) => p);
                        return {
                            title: p.text,
                            file,
                            path: file.path,
                            children,
                            outlinks: children.map((p) => p.path),
                        } as ListItem;
                    })
            );
        } else {
            let line = lines[lists[i].key - 1],
                listItem: ListItem = {
                    title: "",
                    file: null,
                    path: "",
                    outlinks: [],
                    children: [],
                };
            listItem.file = file;
            listItem.path = file.path;
            if (!line || line == "") {
                listItem.title = headers
                    .filter((p) => p.position.start.line < list[0].position.start.line)
                    .sort((p) => p.position.start.line)
                    .reverse()[0].heading;
            } else listItem.title = line;
            listItem.children = list
                .filter((p) => !p?.parent)
                .map((p) => Text2ListItemChildren(p.text, regex, app, file))
                .filter((p) => p);
            // if (listItem.children.length < 2) continue;
            listItem.outlinks = listItem.children.map((p) => p.path);
            listItems.push(listItem);
        }
    }
    return new Navbox(app, plugin, listItems, file);
}

function Text2ListItemChildren(
    text: string,
    regex: RegExp,
    app: App,
    file: TFile
): ListItemChildren {
    let t = regex.exec(text);
    if (!t?.[1]) return null;
    if (!text.startsWith(t?.[0])) return null;
    // if (t[1].length / text.length < 1 / 25) return null;
    let tfile = app.metadataCache.getFirstLinkpathDest(t[1], file.path);
    if (!tfile) return null;
    return {
        file: tfile,
        path: tfile.path,
        name: t[1],
        linkText: t[1] + (t?.[2] ?? ""),
        display: t?.[3]?.slice(1),
    } as ListItemChildren;
}

function Text2TFile(text: string, regex: RegExp, app: App, file: TFile): TFile {
    let t = regex.exec(text);
    if (!t?.[1]) return null;
    if (!text.startsWith(t?.[0])) return null;
    let tfile = app.metadataCache.getFirstLinkpathDest(t[1], file.path);
    if (!tfile) return null;
    return tfile;
}
