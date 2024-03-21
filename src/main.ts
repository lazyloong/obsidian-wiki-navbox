import { Plugin, TFile, WorkspaceLeaf, MarkdownView } from "obsidian";
import { getAPI, DataviewApi } from "obsidian-dataview";
import NavData from "./data";
import TFile2NavData from "./parser";
import NavboxManager from "./manager";

interface TheSettings {
    mySetting: string;
}
const DEFAULT_SETTINGS: TheSettings = {
    mySetting: "default",
};
export default class ThePlugin extends Plugin {
    settings: TheSettings;
    leafs: WorkspaceLeaf[];
    navboxFiles: TFile[];
    navDatas: NavData[];
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
        this.navDatas = await Promise.all(
            this.navboxFiles.map((f) => TFile2NavData(f, this.regex, this.app, this))
        );

        this.registerEvent(
            this.app.workspace.on("file-open", () => {
                let leaf = this.app.workspace.getMostRecentLeaf();
                if (leaf.view.getViewType() != "markdown") return;
                let view = leaf.view as MarkdownView;
                if (view.navboxManager) {
                    view.navboxManager.render(view.file);
                } else {
                    let manager = new NavboxManager(view, this);
                    view.addChild(manager);
                    view.navboxManager = manager;
                }
            })
        );
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", (leaf) => {
                if (leaf.view.getViewType() != "markdown") return;
                const view = leaf.view as MarkdownView;
                if (!view.navboxManager) return;
                let manager = new NavboxManager(view, this);
                view.addChild(manager);
                view.navboxManager = manager;
            })
        );
        this.registerEvent(
            this.app.metadataCache.on("changed", (file) => {
                this.updateFiles(file);
            })
        );
    }
    async updateFiles(file: TFile) {
        if (this.navboxFiles.includes(file)) {
            this.navboxFiles = this.app.vault
                .getMarkdownFiles()
                .filter((f) => this.app.metadataCache.getFileCache(f).frontmatter?.navbox);
            this.navDatas = await Promise.all(
                this.navboxFiles.map((f) => TFile2NavData(f, this.regex, this.app, this))
            );
        } else if (this.app.metadataCache.getFileCache(file).frontmatter?.navbox) {
            this.navboxFiles.push(file);
            this.navDatas.push(await TFile2NavData(file, this.regex, this.app, this));
        }
    }
    onunload() {}
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
}
