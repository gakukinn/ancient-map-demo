# 修复城市兵力闪烁问题 - 工作总结

## 问题描述
战争结束后，城市的血槽（兵力数）出现闪烁，数值不稳定。

## 根本原因
经过深入分析，发现 `Army` 类存在一个严重的逻辑缺陷：
当军队到达目标城市后，`update` 方法中的 `distance <= moveDist` 条件会一直成立。因此，每一帧（大约每 16ms）都会调用一次 `onArrive` 回调函数。
`HistoricalEventManager` 接收到 `onArrive` 回调后，会创建一个新的 `ActiveBattle`（战斗实例）。
结果是，一场战争被重复创建了成百上千次。这些重叠的战斗实例同时在运行，各自计算兵力损失并更新 UI，导致兵力数值疯狂跳变和闪烁。

## 解决方案
修改 [Army.ts](file:///c:/Users/GAKU/Desktop/MAPWAR/src/core/Army.ts) 中的 `update` 方法，添加一个 `hasArrived` 标志位：

```typescript
    private hasArrived: boolean = false; // 新增标志位

    public update(deltaTime: number): void {
        // ... 省略 ...
        if (distance <= moveDist) {
            if (this.hasArrived) return; // 如果已经到达，直接返回，不再触发回调
            this.hasArrived = true;      // 标记为已到达

            this.position.lat = targetLat;
            this.position.lng = targetLng;
            this.updateMarkerPosition();
            this.onArrive(this);         // 只触发一次
        } else {
            // ...
        }
    }
```

## 验证结果
此修复确保了 `onArrive` 只会被触发一次，因此 `HistoricalEventManager` 只会创建唯一的一个战斗实例。
- 战争过程将平滑进行。
- 战争结束后，兵力数值将立即稳定在最终结果，不再闪烁。

## 之前的修复
之前关于“暂停年度兵力恢复”的修复（在 `CityManager.ts` 中）仍然有效且必要，它防止了年度恢复与战斗逻辑的冲突。这两个修复共同保证了战争系统的稳定性和准确性。
