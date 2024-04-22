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
import ThePlugin from "./main";
import NavData from "./data";
import Link from "./linkComponent";

export default class NavboxRenderer extends Component {
    plugin: ThePlugin;
    app: App;
    navdata: NavData;
    tableEl: HTMLDivElement;
    regex: RegExp;
    constructor(navdata: NavData, plugin: ThePlugin) {
        super();
        this.app = plugin.app;
        this.plugin = plugin;
        this.navdata = navdata;
    }
    render(root: Element, path: string) {
        let { file, title, listItems, outlinks } = this.navdata;
        this.tableEl = root.createEl("div", { cls: "wiki-navbox" });
        let table = this.tableEl.createEl("table");
        table.createTHead();
        table.createTBody();
        let tr = table.tHead.insertRow();
        let th = tr.createEl("th");
        th.colSpan = 2;
        if (path == file.path) th.createEl("strong", { text: title });
        else new Link(file, title, th, this.plugin);

        listItems.forEach(async (listItem) => {
            if (listItem.children.length == 0) return;

            tr = table.tBodies[0].insertRow();
            let td = tr.createEl("td");
            MarkdownRenderer.render(
                this.app,
                listItem.title,
                td,
                this.plugin.rootPath + "/" + file.path,
                this
            );
            let a1 = td.querySelector("a.internal-link") as HTMLElement;
            let file_ = Text2TFile(listItem.title, this.plugin.regex, this.app, file);
            if (a1) clickOpenFile(a1, file_, file.basename, this.plugin);

            td = tr.createEl("td");
            listItem.children.forEach((p, i) => {
                if (i > 0) td.createEl("strong", { cls: "wiki-navbox-separator", text: "·" });
                if (p.file.path == path)
                    td.createEl("strong", { text: p.display ?? p.file.basename });
                else new Link(p.file, p.display, td, this.plugin);
            });
        });
    }
    onunload(): void {
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
