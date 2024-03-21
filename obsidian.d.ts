import {} from "obsidian";
import NavboxManager from "./src/manager";

declare module "obsidian" {
    interface MarkdownView {
        navboxManager: NavboxManager;
    }
    interface WorkspaceLeaf {
        openLinkText: (text: string, path: string, file: any) => void;
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
        addSections: (sections: string[]) => Menu;
        setParentElement: (element: HTMLElement) => Menu;
    }
}
