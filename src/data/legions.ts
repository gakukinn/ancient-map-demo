
export interface LegionConfig {
    id: string;
    name: string;
    factionId: string;
    type: 'infantry' | 'cavalry' | 'archer_cavalry' | 'mixed' | 'huaxia_infantry' | 'huaxia_mixed' | 'huaxia_cavalry' | 'zhonghua_infantry' | 'zhonghua_mixed' | 'zhonghua_cavalry' | 'yuenan_infantry' | 'huihui_cavalry' | 'huihui_mixed';
}

export const HISTORICAL_LEGIONS: LegionConfig[] = [];
