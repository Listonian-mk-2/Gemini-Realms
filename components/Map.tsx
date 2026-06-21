
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { World, Direction } from '../game/types';

interface MapProps {
    world: World;
    visitedRooms: string[];
    playerLocation: string;
    onClose?: () => void;
}

interface RoomPosition {
    id: string;
    x: number;
    y: number;
}

const ROOM_SIZE = 120;
const ROOM_GAP = 60;
const GRID_UNIT = ROOM_SIZE + ROOM_GAP;

const calculateLayout = (world: World, visitedRooms: string[]): RoomPosition[] => {
    if (visitedRooms.length === 0) {
        return [];
    }

    const positions: { [roomId: string]: { x: number; y: number } } = {};
    const queue: string[] = [visitedRooms[0]];
    const visitedForLayout = new Set<string>([visitedRooms[0]]);
    
    positions[visitedRooms[0]] = { x: 0, y: 0 };

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentRoom = world.rooms[currentId];
        const currentPos = positions[currentId];

        if (!currentRoom) continue;

        for (const dir in currentRoom.exits) {
            const direction = dir as Direction;
            const nextId = currentRoom.exits[direction];

            if (nextId && visitedRooms.includes(nextId) && !visitedForLayout.has(nextId)) {
                visitedForLayout.add(nextId);
                let nextPos = { ...currentPos };

                switch (direction) {
                    case 'north': nextPos.y--; break;
                    case 'south': nextPos.y++; break;
                    case 'east': nextPos.x++; break;
                    case 'west': nextPos.x--; break;
                }
                
                // Simple collision avoidance
                let attempts = 0;
                while (Object.values(positions).some(p => p.x === nextPos.x && p.y === nextPos.y) && attempts < 5) {
                     if(direction === 'north' || direction === 'south') nextPos.x++;
                     else nextPos.y++;
                     attempts++;
                }
                
                positions[nextId] = nextPos;
                queue.push(nextId);
            }
        }
    }

    return Object.entries(positions).map(([id, pos]) => ({ id, ...pos }));
};

export const Map: React.FC<MapProps> = ({ world, visitedRooms, playerLocation, onClose }) => {
    const layout = useMemo(() => calculateLayout(world, visitedRooms), [world, visitedRooms]);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);

    // Initial centering logic
    useEffect(() => {
        if (layout.length === 0 || !containerRef.current) return;
        
        const minX = Math.min(...layout.map(p => p.x));
        const maxX = Math.max(...layout.map(p => p.x));
        const minY = Math.min(...layout.map(p => p.y));
        const maxY = Math.max(...layout.map(p => p.y));

        const contentW = (maxX - minX) * GRID_UNIT + ROOM_SIZE;
        const contentH = (maxY - minY) * GRID_UNIT + ROOM_SIZE;
        const contentCenterX = minX * GRID_UNIT + contentW / 2;
        const contentCenterY = minY * GRID_UNIT + contentH / 2;

        const { clientWidth, clientHeight } = containerRef.current;
        
        // Add some padding
        const scaleX = (clientWidth - 100) / contentW;
        const scaleY = (clientHeight - 100) / contentH;
        // Clamp initial scale
        const initialScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1); 

        setTransform({
            x: clientWidth / 2 - contentCenterX * initialScale,
            y: clientHeight / 2 - contentCenterY * initialScale,
            k: initialScale
        });

    }, [layout.length]); // Re-center only when number of rooms changes (discovery)

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && onClose) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // --- Mouse Events ---

    const handleWheel = (e: React.WheelEvent) => {
        // Stop the page from scrolling
        e.stopPropagation(); 
        
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.max(0.1, Math.min(5, transform.k * (1 + scaleAmount)));
        
        const rect = containerRef.current!.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const newX = cursorX - (cursorX - transform.x) * (newScale / transform.k);
        const newY = cursorY - (cursorY - transform.y) * (newScale / transform.k);

        setTransform({ x: newX, y: newY, k: newScale });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        }));
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleMouseLeave = () => setIsDragging(false);

    // --- Touch Events ---
    
    const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
        return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - transform.x, y: e.touches[0].clientY - transform.y });
        } else if (e.touches.length === 2) {
            setIsDragging(false); // Stop dragging if pinching
            const dist = getDistance(e.touches[0], e.touches[1]);
            setLastPinchDistance(dist);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault(); // Prevent page scroll
        if (e.touches.length === 1 && isDragging) {
             setTransform(prev => ({
                ...prev,
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y
            }));
        } else if (e.touches.length === 2 && lastPinchDistance !== null) {
            const dist = getDistance(e.touches[0], e.touches[1]);
            const delta = dist / lastPinchDistance;
            
            // Zoom centered on the midpoint of touches could be implemented, 
            // but simple zoom (center screen) is safer for now without complex math
            const newScale = Math.max(0.1, Math.min(5, transform.k * delta));
            
            // Find midpoint to zoom towards
            const rect = containerRef.current!.getBoundingClientRect();
            const midX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            const midY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;

            const newX = midX - (midX - transform.x) * (newScale / transform.k);
            const newY = midY - (midY - transform.y) * (newScale / transform.k);

            setTransform({ x: newX, y: newY, k: newScale });
            setLastPinchDistance(dist);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setLastPinchDistance(null);
    };

    if (layout.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                ref={containerRef}
                className="relative w-11/12 h-5/6 bg-gray-900/80 border border-red-900/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col select-none"
                onClick={e => e.stopPropagation()}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                 {/* Header */}
                 <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-gray-900 to-transparent pointer-events-none">
                     <h2 className="text-3xl text-red-500 font-bold tracking-widest pointer-events-auto drop-shadow-md" style={{fontFamily: "'IM Fell English', serif"}}>World Map</h2>
                     <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors pointer-events-auto bg-black/50 hover:bg-red-900/50 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold">
                        ✕
                     </button>
                 </div>

                 {/* Zoom Controls */}
                 <div className="absolute bottom-6 right-6 z-10 flex flex-col space-y-2 pointer-events-auto">
                    <button 
                        className="w-10 h-10 bg-gray-800 border border-gray-600 rounded-full text-white font-bold hover:bg-gray-700 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                        onClick={() => {
                            const newScale = Math.min(5, transform.k * 1.2);
                            const rect = containerRef.current!.getBoundingClientRect();
                            const cx = rect.width / 2;
                            const cy = rect.height / 2;
                            const newX = cx - (cx - transform.x) * (newScale / transform.k);
                            const newY = cy - (cy - transform.y) * (newScale / transform.k);
                            setTransform({ x: newX, y: newY, k: newScale });
                        }}
                    >
                        +
                    </button>
                    <button 
                         className="w-10 h-10 bg-gray-800 border border-gray-600 rounded-full text-white font-bold hover:bg-gray-700 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                         onClick={() => {
                             const newScale = Math.max(0.1, transform.k / 1.2);
                             const rect = containerRef.current!.getBoundingClientRect();
                             const cx = rect.width / 2;
                             const cy = rect.height / 2;
                             const newX = cx - (cx - transform.x) * (newScale / transform.k);
                             const newY = cy - (cy - transform.y) * (newScale / transform.k);
                             setTransform({ x: newX, y: newY, k: newScale });
                         }}
                    >
                        -
                    </button>
                 </div>

                <div className="w-full h-full cursor-move">
                    <svg width="100%" height="100%">
                        <defs>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                             <linearGradient id="roomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2D3748" />
                                <stop offset="100%" stopColor="#1A202C" />
                            </linearGradient>
                            <linearGradient id="currentRoomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#9B2C2C" />
                                <stop offset="100%" stopColor="#742A2A" />
                            </linearGradient>
                        </defs>
                        
                        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                            {/* Draw connections first so they are behind rooms */}
                            {layout.map(pos => {
                                const room = world.rooms[pos.id];
                                if (!room) return null;
                                const x = pos.x * GRID_UNIT;
                                const y = pos.y * GRID_UNIT;
                                const cx = x + ROOM_SIZE / 2;
                                const cy = y + ROOM_SIZE / 2;

                                return Object.entries(room.exits).map(([dir, exitId]) => {
                                    if (!exitId) return null;
                                    const direction = dir as Direction;
                                    const endPos = layout.find(p => p.id === exitId);
                                    
                                    if (endPos) {
                                        // Visited connection
                                        const ex = endPos.x * GRID_UNIT;
                                        const ey = endPos.y * GRID_UNIT;
                                        const ecx = ex + ROOM_SIZE / 2;
                                        const ecy = ey + ROOM_SIZE / 2;
                                        
                                        return (
                                            <line 
                                                key={`${pos.id}-${exitId}`} 
                                                x1={cx} 
                                                y1={cy} 
                                                x2={ecx} 
                                                y2={ecy} 
                                                stroke="#4A5568" 
                                                strokeWidth="4" 
                                                strokeDasharray="8,4"
                                                opacity="0.6"
                                            />
                                        );
                                    } else {
                                        // Unvisited exit (stub)
                                        let dx = 0;
                                        let dy = 0;
                                        const stubLen = ROOM_SIZE * 0.8;
                                        
                                        switch (direction) {
                                            case 'north': dy = -stubLen; break;
                                            case 'south': dy = stubLen; break;
                                            case 'east': dx = stubLen; break;
                                            case 'west': dx = -stubLen; break;
                                        }

                                        return (
                                            <g key={`${pos.id}-${direction}-stub`}>
                                                <line 
                                                    x1={cx} 
                                                    y1={cy} 
                                                    x2={cx + dx} 
                                                    y2={cy + dy} 
                                                    stroke="#718096" 
                                                    strokeWidth="4" 
                                                    strokeOpacity="0.3"
                                                />
                                                <circle cx={cx + dx} cy={cy + dy} r="4" fill="#718096" opacity="0.6" />
                                            </g>
                                        );
                                    }
                                });
                            })}

                            {/* Draw rooms */}
                            {layout.map(pos => {
                                const room = world.rooms[pos.id];
                                if (!room) return null;
                                const isPlayerHere = pos.id === playerLocation;
                                const x = pos.x * GRID_UNIT;
                                const y = pos.y * GRID_UNIT;

                                return (
                                    <g key={pos.id} transform={`translate(${x}, ${y})`}>
                                        {/* Room Background */}
                                        <rect
                                            width={ROOM_SIZE}
                                            height={ROOM_SIZE}
                                            rx="12"
                                            fill={isPlayerHere ? "url(#currentRoomGradient)" : "url(#roomGradient)"}
                                            stroke={isPlayerHere ? "#FC8181" : "#4A5568"}
                                            strokeWidth={isPlayerHere ? 3 : 2}
                                            filter={isPlayerHere ? "url(#glow)" : ""}
                                            className="transition-colors duration-300"
                                        />
                                        
                                        {/* Player Indicator Ring */}
                                        {isPlayerHere && (
                                            <circle 
                                                cx={ROOM_SIZE/2} 
                                                cy={ROOM_SIZE/2} 
                                                r={ROOM_SIZE/2 + 8} 
                                                fill="none" 
                                                stroke="#FC8181" 
                                                strokeWidth="2" 
                                                opacity="0.6"
                                            >
                                                <animate attributeName="r" values={`${ROOM_SIZE/2 + 5};${ROOM_SIZE/2 + 15};${ROOM_SIZE/2 + 5}`} dur="2s" repeatCount="indefinite" />
                                                <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                                            </circle>
                                        )}
                                        
                                        {/* Room Name */}
                                        {/* We use SVG text now instead of foreignObject for better scaling */}
                                        <switch>
                                            <foreignObject x="0" y="0" width={ROOM_SIZE} height={ROOM_SIZE}>
                                                 <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                                                    <span className={`text-xs font-bold leading-tight ${isPlayerHere ? 'text-white' : 'text-gray-300'}`}>
                                                        {room.name}
                                                    </span>
                                                    {isPlayerHere && (
                                                        <div className="mt-1 text-[10px] text-red-200 uppercase tracking-wider font-bold bg-red-900/50 px-2 py-0.5 rounded-full">
                                                            YOU
                                                        </div>
                                                    )}
                                                </div>
                                            </foreignObject>
                                        </switch>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
};
