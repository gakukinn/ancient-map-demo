import L from 'leaflet';

/**
 * LakeVectorLayer
 * 
 * 渲染湖泊数据
 */
export class LakeVectorLayer extends L.GeoJSON {
    constructor(data: any, options?: L.GeoJSONOptions) {
        super(data, {
            style: {
                color: '#7BA4C4', // 用户指定的蓝色
                weight: 1,
                opacity: 0.9,
                fillColor: '#7BA4C4',
                fillOpacity: 0.6
            },
            ...options
        });
    }
}
