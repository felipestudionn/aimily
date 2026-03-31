declare module 'imagetracerjs' {
  interface ImageTracerOptions {
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    colorsampling?: number;
    numberofcolors?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    blurradius?: number;
    blurdelta?: number;
    strokewidth?: number;
    linefilter?: boolean;
    desc?: boolean;
    scale?: number;
    roundcoords?: number;
    viewbox?: boolean;
    lcpr?: number;
    qcpr?: number;
  }

  const ImageTracer: {
    imageToSVG(url: string, callback: (svgstr: string) => void, options?: ImageTracerOptions | string): void;
    imagedataToSVG(imagedata: ImageData, options?: ImageTracerOptions | string): string;
  };

  export default ImageTracer;
}
