import { App, TFile } from "obsidian";

export function parseLinktext(linktext: string): { path: string; subpath?: string } {
    const regex = /\[\[(.+?)(#.*?)?(\|.*?)?\]\]/;
    const match = regex.exec(linktext);
    if (match) {
        const path = match[1];
        const subpath = match[2] || undefined;
        return { path, subpath };
    }
}

export function Text2TFile(text: string, app: App, file: TFile): TFile {
    let tfile = app.metadataCache.getFirstLinkpathDest(text, file.path);
    if (!tfile) return;
    return tfile;
}

export function parseTable(tableText: string): { keys: string[]; rows: string[][] } {
    const lines = tableText.split("\n");
    const headerLine = lines[0];
    const bodyLines = lines.slice(2);

    const keys = parseRow(headerLine); // 解析表头
    const rows = bodyLines.map(parseRow); // 解析表格数据
    function parseRow(rowText: string): string[] {
        const unescapedRowText = rowText.replace(/\\\|/g, "|");
        const cells = unescapedRowText.split("|").map((cell) => cell.trim());
        return cells.slice(1, -1);
    }
    return { keys, rows };
}

export async function createFile(name: string): Promise<TFile> {
    return await app.vault.create(
        app.fileManager.getNewFileParent("").path + "/" + name + ".md",
        ""
    );
}
