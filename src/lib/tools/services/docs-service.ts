import { getDocumentation as getDocsImpl, resolveLibraryId } from '../context7';

export interface DocsResult {
    success: boolean;
    found: boolean;
    documentation?: string;
    message?: string;
    source?: string;
}

export async function getDocumentation(query: string, source: 'geeDatasets' | 'communityDatasets' | 'apiDocs'): Promise<DocsResult> {
    const libraryMap: Record<string, string> = {
        geeDatasets: 'wybert/earthengine-dataset-catalog-md',
        communityDatasets: 'samapriya/awesome-gee-community-datasets',
        apiDocs: 'wybert/earthengine-doc-md'
    };

    const libraryId = libraryMap[source];
    if (!libraryId) {
        return { success: false, found: false, message: 'Invalid source' };
    }

    try {
        const result = await getDocsImpl(libraryId, query, { tokens: 15000 });

        if (!result.success || !result.content) {
            return {
                success: true, // Function call synced, just no results
                found: false,
                message: result.message || 'No documentation found'
            };
        }

        return {
            success: true,
            found: true,
            documentation: result.content,
            message: `Documentation found for "${query}"`
        };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, found: false, message: `Error: ${msg}` };
    }
}
