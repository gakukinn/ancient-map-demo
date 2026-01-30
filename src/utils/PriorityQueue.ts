
export class PriorityQueue<T> {
    private heap: T[] = [];
    private compare: (a: T, b: T) => number;

    constructor(compareFn: (a: T, b: T) => number) {
        this.compare = compareFn;
    }

    public push(item: T): void {
        this.heap.push(item);
        this.bubbleUp();
    }

    public pop(): T | undefined {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0 && last !== undefined) {
            this.heap[0] = last;
            this.bubbleDown();
        }
        return top;
    }

    public peek(): T | undefined {
        return this.heap[0];
    }

    public size(): number {
        return this.heap.length;
    }

    public isEmpty(): boolean {
        return this.heap.length === 0;
    }

    public clear(): void {
        this.heap = [];
    }

    private bubbleUp(): void {
        let index = this.heap.length - 1;
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parentIndex]) < 0) {
                this.swap(index, parentIndex);
                index = parentIndex;
            } else {
                break;
            }
        }
    }

    private bubbleDown(): void {
        let index = 0;
        const length = this.heap.length;
        while (true) {
            const leftChildIndex = 2 * index + 1;
            const rightChildIndex = 2 * index + 2;
            let swapIndex = -1;

            if (leftChildIndex < length) {
                if (this.compare(this.heap[leftChildIndex], this.heap[index]) < 0) {
                    swapIndex = leftChildIndex;
                }
            }

            if (rightChildIndex < length) {
                if (
                    (swapIndex === -1 && this.compare(this.heap[rightChildIndex], this.heap[index]) < 0) ||
                    (swapIndex !== -1 && this.compare(this.heap[rightChildIndex], this.heap[swapIndex]) < 0)
                ) {
                    swapIndex = rightChildIndex;
                }
            }

            if (swapIndex !== -1) {
                this.swap(index, swapIndex);
                index = swapIndex;
            } else {
                break;
            }
        }
    }

    private swap(i: number, j: number): void {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}
