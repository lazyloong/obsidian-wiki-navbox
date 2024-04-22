import { Keymap, Menu, TFile, UserEvent, WorkspaceLeaf } from "obsidian";
import ThePlugin from "./main";

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
        this.container = document.createElement("a");
        this.container.dataset.tooltipPosition = "top";
        this.container.setAttribute("aria-label", this.file.basename);
        this.container.dataset.href = this.file.basename;
        this.container.href = this.file.basename;
        this.container.className = "internal-link mathLink-internal-link";
        this.container.target = "_blank";
        this.container.rel = "noopener";
        this.container.textContent = this.display ?? this.file.basename;

        this.container.addEventListener("click", this.click.bind(this));
        this.container.addEventListener("contextmenu", this.contextMenu.bind(this));
        this.container.addEventListener("mouseover", this.mouseover.bind(this));

        this.root.appendChild(this.container);
    }
}
