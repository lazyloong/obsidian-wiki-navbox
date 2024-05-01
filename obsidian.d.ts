import NavboxManager from "./src/manager";

declare module "obsidian" {
    interface MarkdownView {
        navboxManager: NavboxManager;
    }
    interface WorkspaceLeaf {
        openLinkText: (link: string, currentPath: string, unknown = undefined) => void;
    }
    interface Workspace {
        handleLinkContextMenu: (menu: Menu, path: string, file: any) => void;
    }
    interface App {
        commands: {
            registerCommand(command: string, callback: () => void): void;
        };
    }
    interface DataAdapter {
        getBasePath: () => string;
    }
    interface Menu {
        addSections: (sections: string[]) => this;
        setParentElement: (element: HTMLElement) => this;
    }
}
