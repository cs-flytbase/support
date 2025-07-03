import MinimalistDock from '@/components/ui/minimal-dock';
import { TextShimmer } from '@/components/ui/text-shimmer';
import InteractiveCalendar from '@/components/ui/visualize-booking';


export default function Page() {
  return (
    <div className='flex  items-center justify-center h-screen w-screen bg-black'>
        {/* loading */}
    {/* <TextShimmer className='font-mono text-sm' duration={1}>
      booting up...
    </TextShimmer>  */}
  
     {/* <MinimalistDock /> */}
     <InteractiveCalendar />
    </div>
  )
}
