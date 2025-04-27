import { resolveLibraryId, getDocumentation } from '../index';
import fetchMock from 'jest-fetch-mock';

// Enable fetch mocks
beforeAll(() => {
  fetchMock.enableMocks();
});

// Reset mocks between tests
beforeEach(() => {
  fetchMock.resetMocks();
});

describe('resolveLibraryId', () => {
  test('should successfully resolve an Earth Engine library ID', async () => {
    // Mock successful response with Earth Engine result
    fetchMock.mockResponseOnce(JSON.stringify({
      results: [
        {
          id: 'wybert/earthengine-dataset-catalog-md',
          title: 'Earth Engine Dataset Catalog',
          description: 'Documentation for Google Earth Engine datasets'
        },
        {
          id: 'some/other-library',
          title: 'Some Other Library',
          description: 'Not related to Earth Engine'
        }
      ]
    }));

    const result = await resolveLibraryId('Earth Engine datasets');
    
    expect(result.success).toBe(true);
    expect(result.libraryId).toBe('wybert/earthengine-dataset-catalog-md');
    
    // Verify the correct URL was called
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://context7.com/api/v1/search?query='),
      expect.any(Object)
    );
  });

  test('should return the first result when no Earth Engine match is found', async () => {
    // Mock response with no Earth Engine matches
    fetchMock.mockResponseOnce(JSON.stringify({
      results: [
        {
          id: 'library/one',
          title: 'Library One',
          description: 'Some library'
        },
        {
          id: 'library/two',
          title: 'Library Two',
          description: 'Another library'
        }
      ]
    }));

    const result = await resolveLibraryId('data catalog');
    
    expect(result.success).toBe(true);
    expect(result.libraryId).toBe('library/one');
    expect(result.alternatives).toContain('library/two');
  });

  test('should handle empty results', async () => {
    // Mock empty response
    fetchMock.mockResponseOnce(JSON.stringify({
      results: []
    }));

    const result = await resolveLibraryId('nonexistent library');
    
    expect(result.success).toBe(false);
    expect(result.libraryId).toBeNull();
    expect(result.message).toBe('No matching library found');
  });

  test('should handle API errors', async () => {
    // Mock error response
    fetchMock.mockRejectOnce(new Error('Network error'));

    const result = await resolveLibraryId('error test');
    
    expect(result.success).toBe(false);
    expect(result.libraryId).toBeNull();
    expect(result.message).toContain('Error resolving library ID');
  });

  test('should handle non-200 responses', async () => {
    // Mock non-200 response
    fetchMock.mockResponseOnce('', { status: 404 });

    const result = await resolveLibraryId('not found');
    
    expect(result.success).toBe(false);
    expect(result.libraryId).toBeNull();
    expect(result.message).toContain('Failed to search for library ID');
  });
});

describe('getDocumentation', () => {
  test('should fetch documentation successfully', async () => {
    // Mock successful response
    fetchMock.mockResponseOnce(JSON.stringify({
      content: '# Earth Engine Landsat Dataset\n\nThis dataset contains Landsat imagery...',
      tokens: 150
    }));

    const result = await getDocumentation('wybert/earthengine-dataset-catalog-md', 'Landsat');
    
    expect(result.success).toBe(true);
    expect(result.content).toContain('Earth Engine Landsat Dataset');
    expect(result.tokens).toBe(150);
    
    // Verify the correct URL was called with topic
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://context7.com/api/v1/wybert/earthengine-dataset-catalog-md?topic="Landsat"'),
      expect.any(Object)
    );
  });

  test('should fetch documentation without a topic', async () => {
    // Mock successful response
    fetchMock.mockResponseOnce(JSON.stringify({
      content: '# Earth Engine Dataset Overview\n\nThis document contains...',
      tokens: 200
    }));

    const result = await getDocumentation('wybert/earthengine-dataset-catalog-md');
    
    expect(result.success).toBe(true);
    expect(result.content).toContain('Earth Engine Dataset Overview');
    
    // Verify URL was called without topic but with tokens
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://context7.com/api/v1/wybert/earthengine-dataset-catalog-md?tokens='),
      expect.any(Object)
    );
  });

  test('should handle missing library ID', async () => {
    const result = await getDocumentation('');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toContain('Missing Context7-compatible library ID');
    
    // Verify no fetch was made
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('should handle API errors', async () => {
    // Mock error response
    fetchMock.mockRejectOnce(new Error('Network error'));

    const result = await getDocumentation('wybert/earthengine-dataset-catalog-md', 'Population');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toContain('Error fetching documentation');
  });

  test('should handle non-200 responses', async () => {
    // Mock non-200 response
    fetchMock.mockResponseOnce('', { status: 404 });

    const result = await getDocumentation('wybert/nonexistent-library', 'topic');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toContain('Failed to fetch documentation');
  });

  test('should handle missing content in response', async () => {
    // Mock response with missing content
    fetchMock.mockResponseOnce(JSON.stringify({
      // No content field
      tokens: 0
    }));

    const result = await getDocumentation('wybert/earthengine-dataset-catalog-md', 'invalid query');
    
    expect(result.success).toBe(false);
    expect(result.content).toBeNull();
    expect(result.message).toBe('No documentation content found');
  });

  test('should respect tokens parameter', async () => {
    // Mock successful response
    fetchMock.mockResponseOnce(JSON.stringify({
      content: 'Limited content',
      tokens: 1000
    }));

    await getDocumentation('wybert/earthengine-dataset-catalog-md', 'topic', 1000);
    
    // Verify the tokens parameter was included
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('tokens=1000'),
      expect.any(Object)
    );
  });
}); 