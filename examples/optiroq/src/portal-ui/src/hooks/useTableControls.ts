import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

export interface UseTableControlsOptions<T, TFilter = string> {
    /**
     * The complete data array to control.
     */
    data: T[] | undefined;

    /**
     * Initial number of items to show (for "load more" pagination).
     * @default 4
     */
    initialItemsCount?: number;

    /**
     * Number of items to add when loading more.
     * @default 4
     */
    itemsPerLoad?: number;

    /**
     * Function to filter items based on the filter value.
     */
    filterFn?: (item: T, filterValue: TFilter) => boolean;

    /**
     * Function to filter items based on the search query.
     */
    searchFn?: (item: T, query: string) => boolean;

    /**
     * Initial filter value.
     */
    initialFilter?: TFilter;

    /**
     * Debounce delay for search query in ms.
     * @default 300
     */
    debounceDelay?: number;
}

export function useTableControls<T, TFilter = string>({
    data,
    initialItemsCount = 4,
    itemsPerLoad = 4,
    filterFn,
    searchFn,
    initialFilter,
    debounceDelay = 300,
}: UseTableControlsOptions<T, TFilter>) {
    // --- State ---
    const [filterValue, setFilterValue] = useState<TFilter>(initialFilter as TFilter);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery] = useDebounce(searchQuery, debounceDelay);
    const [visibleCount, setVisibleCount] = useState(initialItemsCount);

    // --- Logic ---

    // 1. Filter and Search the data
    const filteredData = useMemo(() => {
        if (!data) return [];
        let result = data;

        // Apply Filter
        if (filterFn) {
            result = result.filter(item => filterFn(item, filterValue));
        }

        // Apply Search
        if (searchFn && debouncedSearchQuery) {
            const query = debouncedSearchQuery.toLowerCase();
            result = result.filter(item => searchFn(item, query));
        }

        return result;
    }, [data, filterValue, debouncedSearchQuery, filterFn, searchFn]);

    // 2. Pagination (slice)
    const visibleItems = useMemo(() => {
        return filteredData.slice(0, visibleCount);
    }, [filteredData, visibleCount]);

    const hasMore = visibleCount < filteredData.length;
    const totalCount = filteredData.length;

    // --- Handlers ---

    const loadMore = () => {
        setVisibleCount(prev => prev + itemsPerLoad);
    };

    const handleFilterChange = (newFilter: TFilter) => {
        setFilterValue(newFilter);
        setVisibleCount(initialItemsCount); // Reset pagination on filter change
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
    };

    // Reset pagination when search actually applies (debounced change)
    useEffect(() => {
        setVisibleCount(initialItemsCount);
    }, [debouncedSearchQuery, initialItemsCount]);

    const resetControls = () => {
        setSearchQuery('');
        if (initialFilter !== undefined) {
            setFilterValue(initialFilter);
        }
        setVisibleCount(initialItemsCount);
    };

    return {
        // Search
        searchQuery,
        setSearchQuery: handleSearchChange,
        debouncedSearchQuery,

        // Filter
        filterValue,
        setFilterValue: handleFilterChange,

        // Pagination
        visibleItems,
        visibleCount,
        hasMore,
        loadMore,
        totalCount,

        // Helpers
        resetControls,
        filteredData,
    };
}
