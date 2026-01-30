import { HistoricalEvent } from '../types/core';
// import { HISTORICAL_EVENTS } from '../data/events';
import { TimeSystem, Season } from './TimeSystem';

/**
 * ChronicleUI - The "Silent Chronicle" Timeline Overlay
 * 
 * Design: "Fading Scroll" (Gradient Overlay) with Year-grouped events.
 * Location: Left side of the screen.
 * Style: Parchment/Ink theme, fading into the map.
 * 
 * Features:
 * - Pre-loads all events from HISTORICAL_EVENTS
 * - Groups events by year for readability
 * - Auto-scrolls to current game year/season
 * - Visual states: Past (dimmed), Current (highlighted), Future (normal)
 */
export class ChronicleUI {
    private container!: HTMLElement;
    private eventsContainer!: HTMLElement;
    private currentYearLabel!: HTMLElement;

    private timeSystem: TimeSystem | null = null;
    private allEvents: HistoricalEvent[] = [];
    private yearGroups: Map<number, HTMLElement> = new Map();
    private eventElements: Map<string, HTMLElement> = new Map(); // key: "year-season-index"
    private currentHighlightKey: string | null = null;

    constructor() {
        this.createDOM();
    }

    private createDOM() {
        // 1. Main Container (The Gradient Overlay)
        this.container = document.createElement('div');
        this.container.id = 'chronicle-overlay';

        // 2. Current Year/Time Header
        const header = document.createElement('div');
        header.className = 'chronicle-header';

        this.currentYearLabel = document.createElement('div');
        this.currentYearLabel.className = 'chronicle-year';
        this.currentYearLabel.innerText = '公元前236年'; // Default

        header.appendChild(this.currentYearLabel);
        this.container.appendChild(header);

        // 3. Events Scroll Container
        this.eventsContainer = document.createElement('div');
        this.eventsContainer.className = 'chronicle-events-list';
        this.container.appendChild(this.eventsContainer);

        document.body.appendChild(this.container);
    }

    /**
     * Initialize with TimeSystem and load all events
     */
    public initialize(timeSystem: TimeSystem): void {
        this.timeSystem = timeSystem;

        // 1. Load all events sorted by year and season
        this.loadAllEvents();

        // 2. Subscribe to time changes
        this.timeSystem.onSeasonChange((season, year) => {
            this.updateYearDisplay(year, season);
            this.syncToTime(year, season);
        });

        this.timeSystem.onYearChange((year) => {
            this.updateYearDisplay(year, this.timeSystem!.getSeason());
        });

        // 3. Initial sync
        this.updateYearDisplay(timeSystem.getYear(), timeSystem.getSeason());
        this.syncToTime(timeSystem.getYear(), timeSystem.getSeason());
    }

    /**
     * Load and render all events from HISTORICAL_EVENTS
     */
    private loadAllEvents(): void {
        // Sort events by year, then by season
        this.allEvents = [];

        // Clear existing
        this.eventsContainer.innerHTML = '';
        this.yearGroups.clear();
        this.eventElements.clear();

        // Group by year (Desc)
        let currentYear: number | null = null;
        let yearGroup: HTMLElement | null = null;

        // Process in reverse order for newest at top
        const reversedEvents = [...this.allEvents].reverse();

        reversedEvents.forEach((event, idx) => {
            const originalIndex = this.allEvents.length - 1 - idx;

            // 1. Create year group header if new year
            if (event.year !== currentYear) {
                currentYear = event.year;
                yearGroup = this.createYearGroup(currentYear);
                this.eventsContainer.appendChild(yearGroup); // Newest year is first in chronological list usually, but since we are reversing, we append
                this.yearGroups.set(currentYear, yearGroup);
            }

            // 2. Create event item
            const eventItem = this.createEventItem(event, originalIndex);
            const eventKey = `${event.year}-${event.season}-${originalIndex}`;
            this.eventElements.set(eventKey, eventItem);

            // 3. Append to year group's event list
            const eventList = yearGroup!.querySelector('.year-events');
            if (eventList) {
                eventList.appendChild(eventItem);
            }
        });
    }

    /**
     * Create a collapsible year group header
     */
    private createYearGroup(year: number): HTMLElement {
        const group = document.createElement('div');
        group.className = 'chronicle-year-group';
        group.dataset.year = year.toString();

        const era = year < 0 ? '公元前' : '公元';
        const absYear = Math.abs(year);

        group.innerHTML = `
            <div class="year-header">
                <span class="year-marker">${era}${absYear}年</span>
                <span class="year-toggle">▼</span>
            </div>
            <div class="year-events"></div>
        `;

        // Toggle collapse on header click
        const header = group.querySelector('.year-header');
        header?.addEventListener('click', () => {
            group.classList.toggle('collapsed');
            const toggle = group.querySelector('.year-toggle');
            if (toggle) {
                toggle.textContent = group.classList.contains('collapsed') ? '▶' : '▼';
            }
        });

        return group;
    }

    /**
     * Create a single event item element
     */
    private createEventItem(event: HistoricalEvent, index: number): HTMLElement {
        const item = document.createElement('div');
        item.className = 'chronicle-item future'; // Default state is future
        item.dataset.year = event.year.toString();
        item.dataset.season = event.season.toString();
        item.dataset.index = index.toString();

        // [MODIFIED] 移除季节徽章和图标，只显示事件描述
        item.innerHTML = `
            <div class="chronicle-content">
                ${event.description}
            </div>
        `;

        return item;
    }

    /**
     * Get icon based on event type
     */
    private getTypeIcon(type: string): string {
        switch (type) {
            case 'siege': return '⚔️';
            case 'field_battle': return '🏹';
            case 'narrative': return '📜';
            default: return '•';
        }
    }

    /**
     * Update the year display in header
     */
    private updateYearDisplay(year: number, _season: Season): void {
        const era = year < 0 ? '公元前' : '公元';
        const absYear = Math.abs(year);
        // [MODIFIED] 移除季节显示，只显示年份
        this.currentYearLabel.innerText = `${era}${absYear}年`;
    }

    /**
     * Sync visual state to current game time
     */
    public syncToTime(year: number, season: Season): void {
        // 1. Update all event states (past/current/future)
        // [MODIFIED] 按年份判断状态，本年的所有事件都显示为 current
        this.allEvents.forEach((event, index) => {
            const key = `${event.year}-${event.season}-${index}`;
            const element = this.eventElements.get(key);
            if (!element) return;

            // Determine state by YEAR only (not season)
            const isPast = event.year < year;
            const isCurrent = event.year === year;  // 本年的所有事件都是 current
            const isFuture = event.year > year;

            element.classList.remove('past', 'current', 'future');
            if (isPast) {
                element.classList.add('past');
            } else if (isCurrent) {
                element.classList.add('current');
            } else {
                element.classList.add('future');
            }

            // Track current highlight for scrolling - scroll to first current year event
            if (isCurrent && this.currentHighlightKey !== `${year}`) {
                this.currentHighlightKey = `${year}`;
                this.scrollToElement(element);
            }
        });

        // 2. Update year group states
        this.yearGroups.forEach((group, groupYear) => {
            group.classList.remove('past-year', 'current-year', 'future-year');
            if (groupYear < year) {
                group.classList.add('past-year');
            } else if (groupYear === year) {
                group.classList.add('current-year');
                // Auto-expand current year
                group.classList.remove('collapsed');
                const toggle = group.querySelector('.year-toggle');
                if (toggle) toggle.textContent = '▼';
            } else {
                group.classList.add('future-year');
            }
        });
    }

    private scrollToElement(element: HTMLElement): void {
        // Scroll to position element at ~1/3 from the top (upper-center)
        const containerRect = this.eventsContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const targetOffset = containerRect.height * 0.15; // 15% from top (more upper)
        const scrollTop = elementRect.top - containerRect.top + this.eventsContainer.scrollTop - targetOffset;

        this.eventsContainer.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
        });
    }

    public show(): void {
        this.container.style.opacity = '1';
        this.container.style.pointerEvents = 'auto';
    }

    public hide(): void {
        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';
    }

    // [NEW] Dynamically add event (Auto-Chronicle)
    public addEvent(eventData: HistoricalEvent): void {
        // 1. Add to data list
        this.allEvents.push(eventData);

        // 2. Ensure Year Group exists
        let yearGroup = this.yearGroups.get(eventData.year);
        if (!yearGroup) {
            yearGroup = this.createYearGroup(eventData.year);
            // [NEWEST FIRST] Prepend new year to the top of the container
            if (this.eventsContainer.firstChild) {
                this.eventsContainer.insertBefore(yearGroup, this.eventsContainer.firstChild);
            } else {
                this.eventsContainer.appendChild(yearGroup);
            }
            this.yearGroups.set(eventData.year, yearGroup);
            this.updateYearDisplay(eventData.year, eventData.season);
        }

        // 3. Create Element & Prepend to Year List (Newest at top within year)
        const index = this.allEvents.length - 1;
        const item = this.createEventItem(eventData, index);
        item.classList.add('current');

        const eventList = yearGroup.querySelector('.year-events');
        if (eventList) {
            // [NEWEST FIRST] Prepend to show latest at top of year group
            if (eventList.firstChild) {
                eventList.insertBefore(item, eventList.firstChild);
            } else {
                eventList.appendChild(item);
            }
        }

        // 4. Highlight & Ensure visible (don't force scroll if user is looking elsewhere, 
        // but for new notifications it's better to show the top)
        // Since it's at the top now, we just scroll to top of container
        this.eventsContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
