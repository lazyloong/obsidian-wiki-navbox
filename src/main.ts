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

        runOnLayoutReady(() => {
            this.loadNavData();
            this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
                this.leafAddManager(leaf);
            });
        });

        this.registerEvent(
            this.app.workspace.on("file-open", () => {
                let leaf = this.app.workspace.getMostRecentLeaf();
                this.leafAddManager(leaf);
            })
        );
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", (leaf) => {
                this.leafAddManager(leaf);
            })
        );
        this.registerEvent(
            this.app.metadataCache.on("changed", (file) => {
                this.updateNavData(file);
            })
        );
    }
    async updateNavData(file: TFile) {
        if (this.navboxFiles.includes(file)) {
            this.navDatas = this.navDatas.filter((d) => d.file.path != file.path);
            if (this.app.metadataCache.getFileCache(file).frontmatter?.navbox)
                this.navDatas.push(await TFile2NavData(file, this));
            else this.navboxFiles = this.navboxFiles.filter((f) => f.path != file.path);
        } else if (this.app.metadataCache.getFileCache(file).frontmatter?.navbox) {
            this.navboxFiles.push(file);
            this.navDatas.push(await TFile2NavData(file, this));
        }
    }
    loadNavData() {
        this.navboxFiles = this.app.vault
            .getMarkdownFiles()
            .filter((f) => this.app.metadataCache.getFileCache(f).frontmatter?.navbox);
        this.navDatas = [];
        this.navboxFiles.forEach(async (f) => this.navDatas.push(await TFile2NavData(f, this)));
    }
    checkNavbox(): boolean {
        let set = new Set(this.navDatas.map((d) => d.file.path));
        let check = this.navboxFiles.every((f) => set.has(f.path));
        if (!check) this.loadNavData();
        return check;
    }
    leafAddManager(leaf: WorkspaceLeaf) {
        if (leaf.view.getViewType() != "markdown") return;
        let view = leaf.view as MarkdownView;
        if (view.navboxManager) {
            view.navboxManager.render(view.file);
        } else {
            let manager = new NavboxManager(view, this);
            view.addChild(manager);
            view.navboxManager = manager;
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

function runOnLayoutReady(calback: Function) {
    if (app.workspace.layoutReady) calback();
    else app.workspace.onLayoutReady(() => calback());
}
