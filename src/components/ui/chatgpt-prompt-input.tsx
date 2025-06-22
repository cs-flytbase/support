import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// --- Utility Function & Radix Primitives (Unchanged) ---
type ClassValue = string | number | boolean | null | undefined;
function cn(...inputs: ClassValue[]): string { return inputs.filter(Boolean).join(" "); }
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => ( <TooltipPrimitive.Portal><TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className)} {...props}>{props.children}{showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}</TooltipPrimitive.Content></TooltipPrimitive.Portal>));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(({ className, align = "center", sideOffset = 4, ...props }, ref) => ( <PopoverPrimitive.Portal><PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} className={cn("z-50 w-64 rounded-xl bg-popover dark:bg-[#303030] p-2 text-popover-foreground dark:text-white shadow-md outline-none animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className)} {...props} /></PopoverPrimitive.Portal>));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => ( <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => ( <DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border-none bg-transparent p-0 shadow-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className)} {...props}><div className="relative bg-card dark:bg-[#303030] rounded-[28px] overflow-hidden shadow-2xl p-1">{children}<DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-background/50 dark:bg-[#303030] p-1 hover:bg-accent dark:hover:bg-[#515151] transition-all"><XIcon className="h-5 w-5 text-muted-foreground dark:text-gray-200 hover:text-foreground dark:hover:text-white" /><span className="sr-only">Close</span></DialogPrimitive.Close></div></DialogPrimitive.Content></DialogPortal>));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// --- SVG Icon Components ---
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}> 
    <path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> 
    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> 
  </svg> 
);

const SendIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}> 
    <path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> 
    <path d="M18.75 12L12 5.25L5.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> 
  </svg> 
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}> 
    <line x1="18" y1="6" x2="6" y2="18" /> 
    <line x1="6" y1="6" x2="18" y2="18" /> 
  </svg> 
);



const FileIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}> 
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path> 
    <polyline points="14 2 14 8 20 8"></polyline> 
  </svg> 
);

// --- The Final, Self-Contained PromptBox Component ---
export interface PromptBoxProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onSend?: (files: File[]) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
}

export interface PromptFiles extends File {
  preview?: string;
}

export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ className, onSend, fileInputRef, disabled, ...props }, ref) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const internalFileInputRef = React.useRef<HTMLInputElement>(null);
    const actualFileInputRef = fileInputRef || internalFileInputRef;
    const [value, setValue] = React.useState("");
    // Track all files with metadata
    const [files, setFiles] = React.useState<Array<{
      name: string,
      type: string,
      size: string,
      isImage: boolean,
      preview?: string,
      file: File // Store the actual file object
    }>>([]);
    const [previewImageIndex, setPreviewImageIndex] = React.useState<number | null>(null);
    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);
    React.useLayoutEffect(() => { const textarea = internalTextareaRef.current; if (textarea) { textarea.style.height = "auto"; const newHeight = Math.min(textarea.scrollHeight, 200); textarea.style.height = `${newHeight}px`; } }, [value]);
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setValue(e.target.value); if (props.onChange) props.onChange(e); };
    const handlePlusClick = () => { actualFileInputRef.current?.click(); };
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { 
      const uploadedFiles = event.target.files ? Array.from(event.target.files) : [];
      
      if (uploadedFiles.length > 0) {
        // Process all files
        const newFiles = uploadedFiles.map(file => {
          const isImage = file.type.startsWith('image/');
          const fileData = {
            name: file.name,
            type: file.type || 'Unknown',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            isImage,
            file // Store the actual file object
          };
          
          // We'll add preview for images later
          return fileData;
        });
        
        // Generate previews for images
        newFiles.forEach((fileData, index) => {
          if (fileData.isImage) {
            const file = uploadedFiles[index];
            const reader = new FileReader();
            reader.onloadend = () => {
              setFiles(prevFiles => {
                const newFilesArray = [...prevFiles];
                if (newFilesArray[index]) {
                  newFilesArray[index] = { ...newFilesArray[index], preview: reader.result as string };
                }
                return newFilesArray;
              });
            };
            reader.readAsDataURL(file);
          }
        });
        
        // Set all files
        setFiles(prev => [...prev, ...newFiles]);
      }
    };
    const handleRemoveFile = (e: React.MouseEvent<HTMLButtonElement>, index: number) => { 
      e.stopPropagation(); 
      setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
      
      // Reset preview if needed
      if (previewImageIndex === index) {
        setPreviewImageIndex(null);
      } else if (previewImageIndex !== null && previewImageIndex > index) {
        // Adjust preview index if we're removing a file before the current preview
        setPreviewImageIndex(previewImageIndex - 1);
      }
    };
    
    const handleOpenImagePreview = (index: number) => {
      setPreviewImageIndex(index);
    };
    
    const handleCloseImagePreview = () => {
      setPreviewImageIndex(null);
    };
    // Enable send button if there's text in the prompt
    const hasValue = value.trim().length > 0;

    return (
      <div className={cn("flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white border dark:bg-[#303030] dark:border-transparent cursor-text", className)}>
        <input type="file" ref={actualFileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={disabled} />
        
        {/* File preview section */}
        {files.length > 0 && (
          <div className="mb-2">
            {/* Image previews in thumbnail grid */}
            {files.some(file => file.isImage) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.filter(file => file.isImage).map((file, idx) => {
                  const fileIndex = files.findIndex(f => f === file);
                  return file.preview ? (
                    <div key={`img-${idx}`} className="relative">
                      <button 
                        type="button" 
                        className="transition-transform" 
                        onClick={() => handleOpenImagePreview(fileIndex)}
                      >
                        <img 
                          src={file.preview} 
                          alt={file.name} 
                          className="h-14 w-14 rounded-lg object-cover" 
                        />
                      </button>
                      <button
                        onClick={(e) => handleRemoveFile(e, fileIndex)}
                        className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/50 dark:bg-[#303030] text-black dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151]"
                        aria-label="Remove image"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Document list */}
            {files.some(file => !file.isImage) && (
              <div className="flex flex-col gap-1">
                {files.filter(file => !file.isImage).map((file, idx) => {
                  const fileIndex = files.findIndex(f => f === file);
                  return (
                    <div key={`doc-${idx}`} className="relative flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-[#3a3a3a] p-2 pr-8">
                      <FileIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-gray-500">{file.type} - {file.size}</span>
                      </div>
                      <button 
                        onClick={(e) => handleRemoveFile(e, fileIndex)} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-[#515151]" 
                        aria-label="Remove document"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Image preview dialog */}
        {previewImageIndex !== null && files[previewImageIndex]?.preview && (
          <Dialog open={previewImageIndex !== null} onOpenChange={(open) => !open && handleCloseImagePreview()}>
            <DialogContent>
              <img 
                src={files[previewImageIndex].preview} 
                alt={files[previewImageIndex].name} 
                className="w-full max-h-[95vh] object-contain rounded-[24px]" 
              />
            </DialogContent>
          </Dialog>
        )}
        
        <textarea ref={internalTextareaRef} rows={1} value={value} onChange={handleInputChange} placeholder="Message..." className="custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 focus:ring-0 focus-visible:outline-none min-h-12" {...props} />
        
        <div className="mt-0.5 p-1 pt-0">
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button" 
                    onClick={handlePlusClick} 
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none"
                    disabled={disabled}
                    aria-label="Upload images or documents"
                    title="Upload images or documents"
                  >
                    <FileIcon className="h-5 w-5" />
                    <span className="sr-only">Upload images or documents</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true}><p>Upload images or documents</p></TooltipContent>
              </Tooltip>
              
              {/* Right-aligned buttons container */}
              <div className="ml-auto flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      onClick={() => onSend?.(files.map(f => f.file))}
                      disabled={disabled} 
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${disabled ? 'bg-gray-300' : 'bg-primary'} text-white transition-all hover:scale-110 focus-visible:outline-none`}
                    >
                      <SendIcon className="h-5 w-5" />
                      <span className="sr-only">Send message</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}><p>Send message</p></TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    );
  }
);
PromptBox.displayName = "PromptBox";

DialogContent.displayName = DialogPrimitive.Content.displayName;
