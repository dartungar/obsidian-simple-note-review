
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

    export function getTodayAsYyyyMmDd(): string {
        const date = new Date();
        const year = date.toLocaleString('default', {year: 'numeric'});
        const month = date.toLocaleString('default', {month: '2-digit'});
        const day = date.toLocaleString('default', {day: '2-digit'});
      
        return [year, month, day].join('-');
    }