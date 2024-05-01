import { Keymap, Menu, TFile, UserEvent, WorkspaceLeaf } from "obsidian";
import ThePlugin from "./main";
import { createFile } from "./utils";

export default class Link {
    container: HTMLAnchorElement;
    constructor(
        public file: TFile,
        public display: string,
        public root: HTMLElement,
        public plugin: ThePlugin
    ) {
        this.render();
    }
    click(event: MouseEvent): void {
        let paneType = Keymap.isModEvent(event as UserEvent);
        let leaf: WorkspaceLeaf;
        if (paneType) leaf = this.plugin.app.workspace.getLeaf(paneType);
        else leaf = this.plugin.app.workspace.getMostRecentLeaf();
        leaf.openFile(this.file);
    }
    contextMenu(event: MouseEvent): void {
        var menu = new Menu().addSections([
            "title",
            "open",
            "action",
            "view",
            "info",
            "",
            "danger",
        ]);
        this.plugin.app.workspace.handleLinkContextMenu(menu, this.file.path, "");
        event.preventDefault();
        menu.setParentElement(this.container).showAtMouseEvent(event);
    }
    mouseover(event: MouseEvent): void {
        this.plugin.app.workspace.trigger("hover-link", {
            event,
            source: "search",
            hoverParent: this.container,
            targetEl: this.container,
            linktext: this.file.path,
            state: null,
        });
    }
    render(): void {
        // `<a data-tooltip-position="top" aria-label="${this.file.basename}" data-href="${this.file.basename}" href="${this.file.basename}" class="internal-link mathLink-internal-link" target="_blank" rel="noopener">${this.navdata.title}</a>`;
        let link = typeof this.file === "string" ? this.file : this.file.basename;
        this.container = document.createElement("a");
        this.container.dataset.tooltipPosition = "top";
        this.container.setAttribute("aria-label", link);
        this.container.dataset.href = link;
        this.container.href = link;
        this.container.className = "internal-link mathLink-internal-link";
        this.container.target = "_blank";
        this.container.rel = "noopener";
        this.container.textContent = this.display ?? link;

        this.container.addEventListener("click", this.click.bind(this));
        this.container.addEventListener("contextmenu", this.contextMenu.bind(this));
        this.container.addEventListener("mouseover", this.mouseover.bind(this));

        this.root.appendChild(this.container);
    }
}

export class UnresolvedLink {
    container: HTMLAnchorElement;
    constructor(
        public name: string,
        public display: string,
        public root: HTMLElement,
        public plugin: ThePlugin
    ) {
        this.render();
    }
    contextMenu(event: MouseEvent): void {
        var menu = new Menu().addSections([
            "title",
            "correction",
            "spellcheck",
            "open",
            "selection-link",
            "selection",
            "insert",
            "clipboard",
            "action",
            "view",
            "info",
            "",
            "danger",
        ]);
        let currentFile = this.plugin.app.workspace.getActiveFile();
        this.plugin.app.workspace.handleLinkContextMenu(menu, this.name, currentFile.path);
        event.preventDefault();
        menu.setParentElement(this.container).showAtMouseEvent(event);
    }
    async click() {
        let file = await createFile(this.name);
        let paneType = Keymap.isModEvent(event as UserEvent);
        let leaf: WorkspaceLeaf;
        if (paneType) leaf = this.plugin.app.workspace.getLeaf(paneType);
        else leaf = this.plugin.app.workspace.getMostRecentLeaf();
        leaf.openFile(file);
        this.plugin.loadNavData();
    }
    render(): void {
        let link = this.name;
        this.container = document.createElement("a");
        this.container.dataset.tooltipPosition = "top";
        this.container.setAttribute("aria-label", link);
        this.container.dataset.href = link;
        this.container.href = link;
        this.container.className = "internal-link mathLink-internal-link is-unresolved";
        this.container.target = "_blank";
        this.container.rel = "noopener";
        this.container.textContent = this.display ?? link;
        this.container.addEventListener("click", this.click.bind(this));
        this.container.addEventListener("contextmenu", this.contextMenu.bind(this));
        this.root.appendChild(this.container);
    }
}
