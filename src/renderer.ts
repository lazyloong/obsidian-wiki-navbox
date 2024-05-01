import { Component, App, MarkdownRenderer } from "obsidian";
import ThePlugin from "./main";
import NavData from "./data";
import Link, { UnresolvedLink } from "./linkComponent";

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
        let { file, title, listItems } = this.navdata;
        let rootPath = this.app.vault.adapter.getBasePath();

        this.tableEl = root.createEl("div", { cls: "wiki-navbox" });
        let table = this.tableEl.createEl("table");
        table.createTHead();
        table.createTBody();
        let tr = table.tHead.insertRow();
        let th = tr.createEl("th");
        th.colSpan = 2;
        if (path == file.path) th.createEl("strong", { text: title });
        else new Link(file, null, title, th, this.plugin);

        listItems.forEach((listItem) => {
            if (listItem.children.length == 0) return;

            tr = table.tBodies[0].insertRow();
            let td = tr.createEl("td");
            MarkdownRenderer.render(this.app, listItem.title, td, rootPath + "/" + file.path, this);

            td = tr.createEl("td");
            let td_div = td.createDiv();
            listItem.children.forEach((p, i) => {
                if (i > 0) td_div.createEl("strong", { cls: "wiki-navbox-separator", text: "·" });
                if (p?.path == path)
                    td_div.createEl("strong", { text: p.display ?? p.file.basename });
                else if (p?.file) new Link(p.file, p.subpath, p.display, td_div, this.plugin);
                else new UnresolvedLink(p.name, p.display, td_div, this.plugin);
            });
        });
    }
    onunload(): void {
        this.tableEl.empty();
    }
}
