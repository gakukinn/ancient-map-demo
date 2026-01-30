export enum Season {
    春 = 0,
    夏 = 1,
    秋 = 2,
    冬 = 3
}

export class TimeSystem {
    private year: number;
    private season: Season;
    private accumulatedTime: number = 0;
    private readonly SEASON_DURATION: number = 15; // 15 seconds per season
    private timeScale: number = 1;
    private isPaused: boolean = false;

    constructor(startYear: number = -236) {
        this.year = startYear;
        this.season = Season.春;
    }

    public setYear(year: number): void {
        this.year = year;
        this.notifyYearChange();
    }

    public setSeason(season: Season): void {
        this.season = season;
        this.notifySeasonChange();
    }

    public update(deltaTime: number): void {
        if (this.isPaused) return;

        this.accumulatedTime += deltaTime * this.timeScale;

        // [REFACTOR] 1 Min = 1 Year Logic
        // We no longer automatically looping seasons/years based on accumulatedTime alone.
        // Instead, we just update the visual "season progress" for UI, 
        // but the actual Year Advance is triggered by HistoricalEventManager.

        // However, we still need to cycle seasons for visual effect (Spring -> Summer -> Autumn -> Winter)
        // Let's keep the season cycle purely visual, but NOT trigger advanceYear automatically when Winter ends.

        const SEASON_DURATION = 15; // Visual duration per season

        if (this.accumulatedTime >= SEASON_DURATION) {
            this.accumulatedTime -= SEASON_DURATION;
            this.advanceSeasonVisual();
        }
    }

    private advanceSeasonVisual(): void {
        // [RESTORE] Automatic Year Advance Logic
        if (this.season < Season.冬) {
            this.season++;
            this.notifySeasonChange();
        } else {
            // End of Winter -> Next Year
            this.nextYear();
        }
    }

    public nextYear(): void {
        this.season = Season.春;
        this.year++;
        // Skip year 0
        if (this.year === 0) {
            this.year = 1;
        }
        this.notifyYearChange();
        this.notifySeasonChange();
    }

    private onYearChangeCallbacks: ((year: number) => void)[] = [];
    private onSeasonChangeCallbacks: ((season: Season, year: number) => void)[] = [];

    private advanceYear(): void {
        this.year++;
        // Skip year 0
        if (this.year === 0) {
            this.year = 1;
        }
        this.notifyYearChange();
    }

    public onYearChange(callback: (year: number) => void): void {
        this.onYearChangeCallbacks.push(callback);
    }

    public onSeasonChange(callback: (season: Season, year: number) => void): void {
        this.onSeasonChangeCallbacks.push(callback);
    }

    private notifyYearChange(): void {
        this.onYearChangeCallbacks.forEach(cb => cb(this.year));
    }

    private notifySeasonChange(): void {
        this.onSeasonChangeCallbacks.forEach(cb => cb(this.season, this.year));
    }

    public setSpeed(speed: number): void {
        this.timeScale = speed;
    }

    private onPauseChangeCallbacks: ((paused: boolean) => void)[] = [];

    public onPauseChange(callback: (paused: boolean) => void): void {
        this.onPauseChangeCallbacks.push(callback);
    }

    private notifyPauseChange(): void {
        this.onPauseChangeCallbacks.forEach(cb => cb(this.isPaused));
    }

    public setPaused(paused: boolean): void {
        if (this.isPaused !== paused) {
            this.isPaused = paused;
            this.notifyPauseChange();
        }
    }

    public togglePause(): void {
        this.isPaused = !this.isPaused;
        this.notifyPauseChange();
    }

    public getFormattedDate(): string {
        const era = this.year < 0 ? '公元前' : '公元';
        const absYear = Math.abs(this.year);
        const periodName = ['春', '夏', '秋', '冬'][this.season];
        return `${era}${absYear}年 ${periodName}`;
    }

    public getYear(): number {
        return this.year;
    }

    public getSeason(): Season {
        return this.season;
    }

    public getSpeed(): number {
        return this.timeScale;
    }

    public isGamePaused(): boolean {
        return this.isPaused;
    }

    public getTotalTime(): number {
        return this.accumulatedTime;
    }

    // [NEW] For Proactive Camera Scheduling
    public getTimeToNextSeason(): number {
        return Math.max(0, this.SEASON_DURATION - this.accumulatedTime);
    }
}
