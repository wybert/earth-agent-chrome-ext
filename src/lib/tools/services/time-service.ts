export interface DateTimeResult {
    timeZone: string;
    dateTime: string;
    year: string;
    month: string;
    day: string;
    weekday: string;
    hour: string;
    minute: string;
    second: string;
    isoString: string;
    unixTimestamp: number;
}

export function getCurrentTime(timeZone?: string): DateTimeResult {
    const now = new Date();
    const resolvedTz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Format the current time in the requested timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: resolvedTz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'long',
    });

    const humanReadable = formatter.format(now);

    // Get date parts for structured output
    const parts = formatter.formatToParts(now).reduce<Record<string, string>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
    }, {});

    return {
        timeZone: resolvedTz,
        dateTime: humanReadable,
        year: parts.year,
        month: parts.month,
        day: parts.day,
        weekday: parts.weekday,
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
        isoString: now.toISOString(),
        unixTimestamp: now.getTime(),
    };
}

export async function waitSeconds(seconds: number): Promise<{ waited: number; message: string }> {
    const waitTime = Math.max(0.5, Math.min(60, seconds)); // Clamp between 0.5 and 60
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    return { waited: waitTime, message: `Waited ${waitTime} seconds` };
}
