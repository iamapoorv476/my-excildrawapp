import { RoomCanvas } from "@/app/components/RoomCanvas";

export default async function CanvasPage({ params }: {
   params: Promise<{roomid: string}>
}) {
    const roomId = (await params).roomid;

    return <RoomCanvas roomId={roomId} />
   
}