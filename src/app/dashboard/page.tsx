import MinimalistDock from "@/components/ui/minimal-dock";
import { TextShimmer } from "@/components/ui/text-shimmer";

import Calendarprod from "./components/Calendarprod";
import { GooeyDemo } from "@/components/Gooye";
import { NavBar } from "@/components/ui/tubelight-navbar";
import MessageDoc from "./components/MessageDoc";
import { AppDoc } from "./components/IconDoc";
import SyncDashboard from "./components/SyncDashboard";


// export default function Page() {
    
    
   
//   return (
//     <div className='flex  items-center justify-center h-screen w-screen bg-black'>
            
//         loading
//     <TextShimmer className='font-mono text-sm' duration={1}>
//       booting up...
//     </TextShimmer> 
//     <GooeyDemo />
//     <GooeyDemo />
//      <MinimalistDock />
//      <InteractiveCalendar />
//      <MessageDoc />
//     </div>
//   )
// }
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page() {
  return (
    <div className="[--header-height:calc(--spacing(14))] bg-black">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4">
              {/* <div className="bg-black rounded-lg p-6">
                <SyncDashboard />
              </div> */}
              {/* <GooeyDemo /> */}
              {/* <MessageDoc /> */}
              <Calendarprod />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
