import {
    DragEvent,
    MouseEvent as ReactMouseEvent,
    FC,
    useRef,
    useState,
    useEffect,
    useCallback,
} from "react";

interface TimelineSegment {
    id: number;
    start: number;
    length: number;
}

interface TimelineTrack {
    id: number;
    segments: TimelineSegment[];
}

const defaultTracks = [
    {
        id: 1,
        segments: [{ id: 1, start: 0, end: 5, length: 100 }],
    },
    {
        id: 2,
        segments: [
            {
                id: 2,
                start: 6,
                end: 10,
                length: 100,
            },
            {
                id: 3,
                start: 120,
                end: 5,
                length: 100,
            },
            {
                id: 4,
                start: 322,
                end: 10,
                length: 100,
            },
        ],
    },
];
const genMockTrack = () => ({
    id: Math.random(),
    segments: [
        {
            id: Math.random(),
            start: 0,
            length: 50 + Math.round(Math.random() * 300),
        },
    ],
});

const TRACK_HEIGHT = 50;

const TimelineEditor: FC = () => {
    const [tracks, setTracks] = useState<TimelineTrack[]>(defaultTracks);
    const [mockTracks, setMockTracks] = useState<TimelineTrack[]>([
        genMockTrack(),
    ]);

    const prevMouseX = useRef(0);

    const dragFromTrackId = useRef<number | null>(null);

    const draggingSegmentId = useRef<number | null>(null);
    const draggingType = useRef<string>("start");

    const draggingSegment = useRef<TimelineSegment | null>(null);
    const insertTrackId = useRef<number | null>(null);

    const handleDragStart = (
        e: DragEvent,
        trackId: number | null,
        segment: TimelineSegment
    ) => {
        prevMouseX.current = e.clientX;

        draggingSegment.current = segment;
        dragFromTrackId.current = trackId;

        insertTrackId.current = Math.random();
    };

    const handleDragOver = (
        e: DragEvent,
        trackId: number,
        trackIndex: number
    ) => {
        e.preventDefault();

        if (!draggingSegment.current) {
            return;
        }

        const deltaX = e.clientX - prevMouseX.current;
        prevMouseX.current = e.clientX;

        const bounding = (e.target as HTMLDivElement).getBoundingClientRect();
        // 计算目标元素的中心点位置
        const centerY = bounding.y + bounding.height / 2;

        const overTop = e.clientY <= centerY - TRACK_HEIGHT / 2;
        const overBottom = e.clientY >= centerY + TRACK_HEIGHT / 2;
        if (overTop || overBottom) {
            const newSegment = {
                ...draggingSegment.current!,
                start: draggingSegment.current!.start + deltaX,
            };

            setTracks((prev) => {
                const newTracks = prev
                    .filter(
                        (t) =>
                            t.id !== insertTrackId.current &&
                            t.segments.length > 0
                    )
                    .map((track) => ({
                        ...track,
                        segments: track.segments.filter(
                            (segment) =>
                                segment.id !== draggingSegment.current!.id
                        ),
                    }));
                newTracks.splice(overTop ? trackIndex : trackIndex + 1, 0, {
                    id: insertTrackId.current!,
                    segments: [newSegment],
                });
                return newTracks;
            });

            draggingSegment.current = newSegment;

            return;
        }

        const newSegment = {
            ...draggingSegment.current!,
            start: draggingSegment.current!.start + deltaX,
        };

        setTracks((prev) =>
            prev
                .filter(
                    (t) =>
                        t.id !== insertTrackId.current && t.segments.length > 0
                )
                .map((track) => {
                    if (trackId !== track.id) {
                        return {
                            ...track,
                            segments: track.segments.filter(
                                (segment) =>
                                    segment.id !== draggingSegment.current!.id
                            ),
                        };
                    } else {
                        return {
                            ...track,
                            segments: [
                                ...track.segments.filter(
                                    (segment) =>
                                        segment.id !==
                                        draggingSegment.current!.id
                                ),
                                newSegment,
                            ],
                        };
                    }
                })
        );

        draggingSegment.current = newSegment;
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();

        prevMouseX.current = 0;
        draggingSegment.current = null;
        dragFromTrackId.current = null;
        insertTrackId.current = null;

        if (!dragFromTrackId.current) {
            setMockTracks([genMockTrack()]);
        }
    };

    /** 监听鼠标按下事件 改变初始值 **/
    const handleMouseDown = (
        event: ReactMouseEvent,
        trackId: number | null,
        segmentId: number,
        type: string
    ) => {
        event.preventDefault();

        prevMouseX.current = event.clientX;

        draggingType.current = type;

        draggingSegmentId.current = segmentId;
        dragFromTrackId.current = trackId;
    };

    const onChange = useCallback((deltaX: number) => {
        setTracks((prev) =>
            prev.map((track) => {
                return dragFromTrackId.current !== track.id
                    ? track
                    : {
                          ...track,
                          segments: track.segments.map((segment) => {
                              if (segment.id === draggingSegmentId.current) {
                                  if (draggingType.current === "start") {
                                      return {
                                          ...segment,
                                          start: segment.start + deltaX,
                                          length: segment.length - deltaX,
                                      };
                                  } else if (draggingType.current === "end") {
                                      return {
                                          ...segment,
                                          length: segment.length + deltaX,
                                      };
                                  }
                              }
                              return segment;
                          }),
                      };
            })
        );
    }, []);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (draggingSegmentId.current) {
                const deltaX = event.clientX - prevMouseX.current;

                // 调用父组件函数，传回移动的宽度或高度
                onChange(deltaX);
                prevMouseX.current = event.clientX;
            }
        };

        const handleMouseUp = () => {
            draggingSegmentId.current = null;
            prevMouseX.current = 0;
        };

        // 添加鼠标移动和抬起事件
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            // 清除监听事件
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [onChange]);

    const renderSegment = (segment: TimelineSegment, track: TimelineTrack) => (
        <div
            key={segment.id}
            draggable
            className="absolute h-full top-0 left-0 bg-[green] cursor-move"
            style={{
                width: segment.length,
                transform: `translateX(${segment.start}px)`,
            }}
            onDragStart={(e) => handleDragStart(e, track.id, segment)}
        >
            <div
                className="absolute top-0 left-0 w-[4px] h-full cursor-col-resize bg-[red]"
                draggable
                onMouseDown={(e) =>
                    handleMouseDown(e, track.id, segment.id, "start")
                }
            ></div>
            <div
                className="absolute top-0 right-0 w-[4px] h-full cursor-col-resize bg-[red]"
                draggable
                onMouseDown={(e) =>
                    handleMouseDown(e, track.id, segment.id, "end")
                }
            ></div>
        </div>
    );

    return (
        <>
            <div
                className="w-full border border-gray-300 py-[10px]"
                onDrop={(e) => handleDrop(e)}
                onDragOver={(e) => e.preventDefault()}
            >
                {tracks.map((track, index) => (
                    <div
                        key={track.id}
                        className="w-full py-[10px] last:pb-[20px]"
                        onDragOver={(e) => handleDragOver(e, track.id, index)}
                    >
                        <div className="w-full h-[50px] border border-gray-300 relative">
                            {track.segments.map((segment) =>
                                renderSegment(segment, track)
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6">
                {mockTracks.map((track) => (
                    <div
                        className="w-[200px] h-[200px] bg-[#00bfff]"
                        key={track.id}
                        draggable
                        onDragStart={(e) =>
                            handleDragStart(e, null, track.segments[0])
                        }
                    >
                        New Segment
                    </div>
                ))}
            </div>
        </>
    );
};

export default TimelineEditor;
