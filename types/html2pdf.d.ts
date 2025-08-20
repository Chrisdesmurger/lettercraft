declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      [key: string]: any;
    };
    jsPDF?: {
      unit?: string;
      format?: string | number[];
      orientation?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement): Html2Pdf;
    save(): Promise<void>;
    output(type?: string): any;
    then(callback: (pdf: any) => void): Html2Pdf;
  }

  function html2pdf(): Html2Pdf;
  export = html2pdf;
}
