
    export function getDateOffsetByNDays(days: number): Date {
        const today = new Date();
        const offsetDate = new Date();
        offsetDate.setDate(today.getDate() - days);
        return offsetDate;
    }

    export function getNumberOfDaysFromToday(datestring: string): number {
        const date = new Date(datestring);
        const today = new Date();
        const diff = today.getTime() - date.getTime();
        return Math.round(diff / (1000 * 60 * 60 * 24));
    }