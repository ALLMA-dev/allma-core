import { useMemo } from 'react';
import { Node, Position } from 'reactflow';
import { StepNodeData, StepType } from '../../../types';

const ALL_HANDLE_IDS = [
    'top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right',
    'left', 'right'
];

const getHandleCoords = (node: Node, handleId: string): [number, number] => {
    const { x, y } = node.position;
    const width = node.width || 0;
    const height = node.height || 0;

    switch (handleId) {
        case 'top-left': return [x + width * 0.25, y];
        case 'top-center': return [x + width * 0.5, y];
        case 'top-right': return [x + width * 0.75, y];
        case 'bottom-left': return [x + width * 0.25, y + height];
        case 'bottom-center': return [x + width * 0.5, y + height];
        case 'bottom-right': return [x + width * 0.75, y + height];
        case 'left': return [x, y + height / 2];
        case 'right': return [x + width, y + height / 2];
        default: return [x + width / 2, y + height / 2]; // Fallback to center
    }
};

const getDistanceSquared = (p1: [number, number], p2: [number, number]): number => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return dx * dx + dy * dy;
};

const mapHandleIdToPosition = (handleId: string): Position => {
    if (handleId.startsWith('top-')) return Position.Top;
    if (handleId.startsWith('bottom-')) return Position.Bottom;
    if (handleId === 'left') return Position.Left;
    if (handleId === 'right') return Position.Right;
    return Position.Bottom; // Default fallback
};

export interface SmartEdgeConnection {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
    sourceHandleId: string;
    targetHandleId: string;
}

/**
 * Calculates the optimal connection points (handles) between two nodes to create the shortest possible edge.
 * It can filter out handles that are already in use to find the next available connection.
 * @param sourceNode The source node of the connection.
 * @param targetNode The target node of the connection.
 * @param usedSourceHandles An optional Set of handle IDs on the source node that are already connected.
 * @param usedTargetHandles An optional Set of handle IDs on the target node that are already connected.
 * @returns An object with coordinates and handle IDs for the connection, or null if nodes are invalid or no handles are available.
 */
export const calculateSmartEdgeConnection = (sourceNode?: Node<StepNodeData>, targetNode?: Node<StepNodeData>, usedSourceHandles?: Set<string>, usedTargetHandles?: Set<string>): SmartEdgeConnection | null => {
    if (!sourceNode || !targetNode || !sourceNode.width || !sourceNode.height || !targetNode.width || !targetNode.height) {
        return null;
    }

    const isSourceEndNode = sourceNode.data?.stepType === StepType.END_FLOW;

    const availableSourceHandles = isSourceEndNode 
        ? [] 
        : ALL_HANDLE_IDS.filter(h => !usedSourceHandles?.has(h));

    const availableTargetHandles = ALL_HANDLE_IDS.filter(h => !usedTargetHandles?.has(h));

    if (availableSourceHandles.length === 0 || availableTargetHandles.length === 0) {
        return null; // No available handles to make a new connection
    }

    let minDistance = Infinity;
    let bestSourceHandleId = '';
    let bestTargetHandleId = '';

    for (const sourceHandleId of availableSourceHandles) {
        for (const targetHandleId of availableTargetHandles) {
            const sourceCoords = getHandleCoords(sourceNode, sourceHandleId);
            const targetCoords = getHandleCoords(targetNode, targetHandleId);
            const distance = getDistanceSquared(sourceCoords, targetCoords);

            if (distance < minDistance) {
                minDistance = distance;
                bestSourceHandleId = sourceHandleId;
                bestTargetHandleId = targetHandleId;
            }
        }
    }

    if (bestSourceHandleId && bestTargetHandleId) {
        const [sx, sy] = getHandleCoords(sourceNode, bestSourceHandleId);
        const [tx, ty] = getHandleCoords(targetNode, bestTargetHandleId);
        return {
            sourceX: sx,
            sourceY: sy,
            targetX: tx,
            targetY: ty,
            sourcePosition: mapHandleIdToPosition(bestSourceHandleId),
            targetPosition: mapHandleIdToPosition(bestTargetHandleId),
            sourceHandleId: bestSourceHandleId,
            targetHandleId: bestTargetHandleId,
        };
    }

    return null;
};

export const useSmartEdge = (sourceNode?: Node<StepNodeData>, targetNode?: Node<StepNodeData>) => {
    return useMemo(() => {
        // For rendering existing edges, we don't filter used handles.
       return calculateSmartEdgeConnection(sourceNode, targetNode);
    }, [sourceNode, targetNode]);
};