import {
    Component,
    App,
    TFile,
    MarkdownRenderer,
    Keymap,
    UserEvent,
    WorkspaceLeaf,
    Menu,
} from "obsidian";
import { ListItem } from "obsidian-dataview";
import ThePlugin from "./main";
import NavData from "./data";

export default class NavboxRenderer extends Component {
    plugin: ThePlugin;
    app: App;
    file: TFile;
    listItems: ListItem[];
    tableEl: HTMLDivElement;
    outlinks: string[];
    regex: RegExp;
    title: string;
    constructor(app: App, navdata: NavData, plugin: ThePlugin) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.file = navdata.file;
        this.listItems = navdata.listItems;
        this.outlinks = this.listItems.map((p) => p.outlinks).flat();
        let navbox = this.app.metadataCache.getFileCache(this.file).frontmatter?.navbox;
        this.title = typeof navbox == "string" ? navbox : this.file.basename;
    }
    render(root: Element, path: string) {
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
            this
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
                this
            );
            let a1 = td.querySelector("a.internal-link") as HTMLElement;
            let file = Text2TFile(listItem.title, this.plugin.regex, this.app, this.file);
            if (a1) clickOpenFile(a1, file, file.basename, this.plugin);

            td = tr.createEl("td");
            await MarkdownRenderer.render(
                this.app,
                text.join(' <span style="font-weight: 700">·</span> '),
                td,
                this.plugin.rootPath + "/" + this.file.path,
                this
            );
            let a2 = td.querySelectorAll("a.internal-link") as NodeListOf<HTMLElement>;
            a2.forEach((p) => {
                let name = p.getAttribute("data-href");
                let children = listItem.children.find((p) => p.name == name);
                clickOpenFile(p, children.file, children.linkText, this.plugin);
            });
        });
    }
    empty() {
        this.tableEl.empty();
    }
}

function clickOpenFile(el: HTMLElement, file: TFile, linkText: string, plugin: ThePlugin) {
    el.addEventListener("click", (e) => {
        let m = Keymap.isModEvent(e as UserEvent);
        let leaf: WorkspaceLeaf;
        if (m) leaf = plugin.app.workspace.getLeaf(m);
        else leaf = plugin.app.workspace.getMostRecentLeaf();
        if (linkText.includes("#")) leaf.openLinkText(linkText, file.path, null);
        else leaf.openFile(file);
    });
    el.addEventListener("contextmenu", (e) => {
        var t = new Menu().addSections(["title", "open", "action", "view", "info", "", "danger"]);
        plugin.app.workspace.handleLinkContextMenu(t, file.path, "");
        e.preventDefault();
        t.setParentElement(el).showAtMouseEvent(e);
    });
}

function Text2TFile(text: string, regex: RegExp, app: App, file: TFile): TFile {
    let t = regex.exec(text);
    if (!t?.[1]) return null;
    if (!text.startsWith(t?.[0])) return null;
    let tfile = app.metadataCache.getFirstLinkpathDest(t[1], file.path);
    if (!tfile) return null;
    return tfile;
}
