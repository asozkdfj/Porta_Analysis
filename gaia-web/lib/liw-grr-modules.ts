import {

  listBarcodes,

  listSocketsForBarcode,

  pickPrimaryRun,

} from "./liw-linearity";

import type { LinearityRunOption } from "./liw-linearity-types";

import { formatGrrModuleSlotLabel, GRR_MODULE_COUNT } from "./liw-grr-config";

import type { GrrResultRow } from "./liw-grr-types";

import { formatBarcodeChartLabel } from "./temperature-tracking";

import type { ParsedCsv } from "./types";



export interface GrrModuleItem {

  slot: number;

  slotLabel: string;

  barcode: string | null;

  barcodeLabel: string | null;

  socket: string | null;

  runCount: number;

  resultLabel: string | null;

  primaryRun: LinearityRunOption | null;

}



function primaryRowForBarcode(

  batchResults: GrrResultRow[],

  barcode: string,

  parsed: ParsedCsv

): GrrResultRow | null {

  const rows = batchResults.filter((r) => r.run.barcode === barcode);

  if (rows.length === 0) return null;



  const runs = rows.map((r) => r.run);

  const primary = pickPrimaryRun(runs, parsed);

  if (!primary) return rows[0] ?? null;



  return rows.find((r) => r.run.runId === primary.runId) ?? rows[0] ?? null;

}



/** CSV Barcode를 M01~M08 슬롯에 매핑 (최대 8개) */

export function buildGrrModules(

  parsed: ParsedCsv,

  batchResults: GrrResultRow[]

): GrrModuleItem[] {

  const barcodes = listBarcodes(parsed);



  return Array.from({ length: GRR_MODULE_COUNT }, (_, i) => {

    const slot = i + 1;

    const barcode = barcodes[i] ?? null;



    if (!barcode) {

      return {

        slot,

        slotLabel: formatGrrModuleSlotLabel(slot),

        barcode: null,

        barcodeLabel: null,

        socket: null,

        runCount: 0,

        resultLabel: null,

        primaryRun: null,

      };

    }



    const sockets = listSocketsForBarcode(parsed, barcode);

    const socket = sockets[0] ?? null;

    const primaryRow = primaryRowForBarcode(batchResults, barcode, parsed);

    const runCount = batchResults.filter((r) => r.run.barcode === barcode).length;



    return {

      slot,

      slotLabel: formatGrrModuleSlotLabel(slot),

      barcode,

      barcodeLabel: formatBarcodeChartLabel(barcode),

      socket,

      runCount,

      resultLabel: primaryRow?.overallResult ?? null,

      primaryRun: primaryRow?.run ?? null,

    };

  });

}



export function countActiveGrrModules(modules: GrrModuleItem[]): number {

  return modules.filter((m) => m.barcode !== null).length;

}

