// packages/allma-admin-shell/src/utils/formatters.ts
import { formatDistance, intervalToDuration } from 'date-fns';

/**
 * Formats a duration in milliseconds into a human-readable, precise string.
 * Examples:
 * - 123 -> "123 ms"
 * - 1234 -> "1.234s"
 * - 61234 -> "1m 1.234s"
 * - 3661234 -> "1h 1m 1.234s"
 */
export const formatPreciseDuration = (ms: number | undefined | null): string => {
    if (ms === undefined || ms === null || ms < 0) {
        return 'duration n/a';
    }

    if (ms < 1000) {
        return `${ms} ms`;
    }

    const duration = intervalToDuration({ start: 0, end: ms });

    const parts: string[] = [];
    if (duration.days) parts.push(`${duration.days}d`);
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);

    const seconds = duration.seconds ?? 0;
    const milliseconds = ms % 1000;
    
    // Only show seconds part if there are any seconds or milliseconds
    if (seconds > 0 || milliseconds > 0) {
      // Create a fractional second representation
      const totalSecondsWithFraction = seconds + (milliseconds / 1000);
      
      // Format to 3 decimal places and remove trailing zeros and the trailing dot.
      const formattedSeconds = totalSecondsWithFraction.toFixed(3).replace(/\.?0+$/, '');
      
      parts.push(`${formattedSeconds}s`);
    } else if (parts.length === 0) {
      // Handle the case of exactly 0 ms
      return '0 ms';
    }

    return parts.join(' ');
};

/**
 * Replaces vague durations like "less than a minute" with precise values.
 * For example: "less than a minute (23 seconds)".
 * @param start The start date/time (string or Date object).
 * @param end The end date/time (string or Date object).
 * @returns A formatted string with both a fuzzy distance and a precise value.
 */
export const formatFuzzyDurationWithDetail = (start: Date | string, end: Date | string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Ensure dates are valid before proceeding
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 'Invalid date';
    }

    const distance = formatDistance(endDate, startDate, { addSuffix: false });
    
    const durationMs = endDate.getTime() - startDate.getTime();

    if (durationMs < 60 * 1000) { // less than a minute
        return `${distance} (${Math.round(durationMs / 1000)} seconds)`;
    }
    
    if (durationMs < 60 * 60 * 1000) { // less than an hour
        return `${distance} (${Math.floor(durationMs / 60000)}m, ${Math.round((durationMs % 60000) / 1000)}s)`;
    }

    // For longer durations, append the precise hour/minute value
    const duration = intervalToDuration({ start: startDate, end: endDate });
    const preciseParts: string[] = [];
    if (duration.hours) preciseParts.push(`${duration.hours}h`);
    if (duration.minutes) preciseParts.push(`${duration.minutes}m`);

    return `${distance} (${preciseParts.join(' ')})`;
};