'use client';
import React, { useCallback, useRef, useState, forwardRef, RefObject, useMemo } from 'react'
import DataGrid, {
  Column, Paging, Pager, SearchPanel, Editing, Popup, Form, Selection, type DataGridTypes, Item,
  Toolbar, Export, DataGridRef, LoadPanel, Scrolling
} from 'devextreme-react/data-grid';
import type { ContentReadyEvent, GridsEditMode } from 'devextreme/ui/data_grid';
import 'devextreme-react/text-area';
import 'devextreme/dist/css/dx.light.css';
import type { LocateInMenuMode, ShowTextMode } from "devextreme/ui/toolbar";
import type { ToolbarItemLocation, ToolbarItemComponent, SingleMultipleOrNone } from "devextreme/common";
import { jsPDF } from 'jspdf';
import { exportDataGrid } from 'devextreme/pdf_exporter';
import { formatString } from "@/utils/definitions";
import { alert, confirm, custom } from 'devextreme/ui/dialog';
import notify from 'devextreme/ui/notify';
import { DeleteData, PostData } from '@/utils/GlobalService';
import { useToast } from '@/components/devextreme/Toast_custom';
type ChildProps = {
  Title: string;
  dataSource: {};
  keyExpr: string;
  cols: [];
  toolbars: any[];
  n: boolean;
  e: boolean;
  d: boolean;
  c: boolean;
  popupWidth: number,
  popupHeight: number,
  selecttion: SingleMultipleOrNone,
  modeEditting: GridsEditMode,
  url: String
};

const colMap: Record<string, any> = {
  df: "dataField",
  c: "caption",
  ml: "editorOptions.maxLength",
  ficc: "formItem.cssClass",
  cp: "formItem.colSpan",
  dt: "dataType",
  f: "format",
  v: "visible",
  vi: "visibleIndex",
  fv: "formItem.visible",
  w: "width",
  ft: "falseText",
  tt: "trueText",
  af: "allowFiltering",
  as: "allowSorting",
  d: "editorOptions.disabled",
  ro: "editorOptions.readOnly",
  edmin: "editorOptions.min",
  edmax: "editorOptions.max",
  n: "name",
  fn: "formItem.name",
  en: "editorOptions.name",
  cc: "cssClass",
  a: "alignment",
  ae: "allowEditing",
  gi: "groupIndex",
  ef: "editorOptions.format",
  edf: "editorOptions.displayFormat",
  eumb: "editorOptions.useMaskBehavior",
  eov: "editorOptions.value",
  fx: "fixed",
  fxp: "fixedPosition",
  ect: "editCellComponent",
  ct: "cellTemplate",
  edph: "editorOptions.placeholder",
  edsc: "editorOptions.showClearButton",
  scv: 'setCellValue',
  ccc: 'calculateCellValue',
  si: 'sortIndex',
  so: 'sortOrder',
  scc: 'showInColumnChooser',
  vr: 'validationRules',
  cl: 'columns',
  fvi: "formItem.visibleIndex",
  edm: "editorOptions.mask",
  edmc: "editorOptions.maskChar",
  edmr: "editorOptions.maskRules",
  mw: "minWidth",
};

const setValueToObject = (obj: any, value: any, path: any) => {
  path = path.split('.');
  if (path.length == 1) {
    obj[path[0]] = value;
  } else {
    var i;
    for (i = 0; i < path.length - 1; i++) {
      if (typeof obj[path[i]] === 'undefined') obj[path[i]] = {};
      obj = obj[path[i]];
    }
    obj[path[i]] = value;
  }
};
const lookUpDisplay = function (item: any, title: any) {
  if (typeof title === 'function') {
    return title(item);
  } else {
    if (Array.isArray(title)) {
      var txt = "";
      title.forEach(function (vl) {
        txt += (txt == "" ? "" : " - ") + item[vl];
      });
      return txt;
    } else {
      return item[title];
    }
  }
};
const buildColumn = (c: any, op: any) => {
  const col: Record<string, any> = { formItem: {}, editorOptions: {} };
  Object.keys(colMap).map(function (k) {
    if (c[k] != null) setValueToObject(col, c[k], colMap[k]);
  });
  if (typeof col.validationRules == 'undefined') col.validationRules = [];
  if (c.hasOwnProperty("lds")) {
    col.lookup = {
      dataSource: c.lds,
      valueExpr: c.lve != null ? c.lve : "_id",
      displayExpr: function (item: any) { return item && lookUpDisplay(item, (c.lde != null ? c.lde : "TEN")) },
    };
    col.editorOptions.showClearButton = true;
  }
  if (op && typeof op.editorOptions !== 'undefined') {
    col.editorOptions = Object.assign(col.editorOptions, op.editorOptions);
    delete op.editorOptions;
  }
  if (op && typeof op.formItem !== 'undefined') {
    col.formItem = Object.assign(col.formItem, op.formItem);
    delete op.formItem;
  }
  Object.assign(col, op || {});

  if (c.hasOwnProperty("rq") && c.rq) col.validationRules.push({ type: "required" });
  return col;
}
const Addcolumn = ({ items }: { items: any[] }) => {
  return (
    <>
      {items.map((item, index) => {
        let ops = item.ops ? { ...item.ops } : {}; // Kiểm tra ops trước khi gán
        //delete item.ops;
        const column = buildColumn(item, ops);
        return <Column key={index} {...column}></Column>;
      })}
    </>
  );

};

const Grid_custom = forwardRef<DataGridRef, ChildProps>((props: ChildProps, gridRef) => {
  const { triggerToast } = useToast();
  const allowedPageSizes = [10, 100, 200];
  const notesEditorOptions = { height: 100 };
  const [toolbars, settoolbars] = useState(props.toolbars || []);

  // const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const selectedRowIndex = useRef(-1);
  const [selectedRowData, setSelectedRowData] = useState([]);
  const [focusedRowKey, setFocusedRowKey] = useState<number | null>(null);

  //accessButton
  const [visibleNew, setvisibleNew] = useState(props.n);
  const [visibleEdit, setvisibleEdit] = useState(props.e);
  const [visibleDelete, setvisibleDelete] = useState(props.d);
  const [visibleCopy, setvisibleCopy] = useState(props.c || false);
  const [height, setheight] = useState(props.popupHeight || 500);
  const [width, setwidth] = useState(props.popupWidth || 700);
  //end
  const selectedChanged = useCallback((e: DataGridTypes.SelectionChangedEvent) => {
    if (e.selectedRowKeys.length > 0) {
      const index = e.component.getRowIndexByKey(e.selectedRowKeys[0]);
      selectedRowIndex.current = index;
      refreshToolbar()
    }else{
      selectedRowIndex.current = -1;
      refreshToolbar();
    }
  }, []);

  const toolbarItem = [
    {
      location: "after" as ToolbarItemLocation,
      widget: "dxButton" as ToolbarItemComponent,
      name: 'myGridRefresh',
      locateInMenu: 'auto' as LocateInMenuMode,
      options: {
        icon: "refresh",
        hint: 'Làm mới dữ liệu',
        onClick: function () {
          (gridRef as RefObject<DataGridRef>).current?.instance().refresh();
        },
      }
    },
    {
      location: 'after' as ToolbarItemLocation,
      widget: 'dxButton' as ToolbarItemComponent,
      name: 'myGridDeleteRow',
      locateInMenu: 'auto' as LocateInMenuMode,
      options: {
        text: "Xóa",
        icon: 'trash',
        type: 'danger',
        hint: "Xoá",
        disabled: selectedRowIndex.current == -1,
        visible: visibleDelete,
        onClick: function () {
          var items_selected = (gridRef as RefObject<DataGridRef>).current?.instance().getSelectedRowsData();
          if (items_selected.length) {
            let result = confirm(`Xác nhận xóa ${items_selected.length} bản ghi đã chọn?`, "Thông báo");
            result.then((dialogResult) => {
              if (dialogResult) {
                var items_selected = (gridRef as RefObject<DataGridRef>).current?.instance().getSelectedRowsData();
                var items: any = [];
                var keyDT = (gridRef as RefObject<DataGridRef>).current?.instance().getDataSource().key();
                items_selected.forEach(function (value) {
                  if (Array.isArray(keyDT)) {
                    var keyArr: any = {};
                    keyDT.forEach(function (val) {
                      keyArr[val] = value[val];
                    });
                    items.push(keyArr);
                  } else {
                    items.push(value[keyDT]);
                  }
                });
                (gridRef as RefObject<DataGridRef>).current?.instance().beginCustomLoading("Đang xử lý ...");
                let result = PostData(props.url + "/Delete", { items: JSON.stringify(items) });
                result.then((response: any) => {
                  if (response.Data != null && response.Data.length) {
                    alert(response.Data.join('<br/>'), "Thông báo");
                  } else {
                    triggerToast('Xóa bản ghi thành công', 'success');
                  }
                  (gridRef as RefObject<DataGridRef>).current?.instance().endCustomLoading();
                  (gridRef as RefObject<DataGridRef>).current?.instance().deselectAll();
                  (gridRef as RefObject<DataGridRef>).current?.instance().refresh();
                });
                (gridRef as RefObject<DataGridRef>).current?.instance().endCustomLoading();
              }
            });
          } else {
            alert("Vui lòng chọn 1 bản ghi", "Thông báo");
          }

        }
      }
    },
    {
      location: 'after' as ToolbarItemLocation,
      widget: 'dxButton' as ToolbarItemComponent,
      name: 'myGridEditRow',
      locateInMenu: 'auto' as LocateInMenuMode,
      options: {
        text: "Sửa",
        icon: 'edit',
        type: 'default',
        hint: "Sửa",
        disabled: selectedRowIndex.current == -1,
        visible: visibleEdit,
        onClick: function () {
          editRow();
        }
      }
    },
    {
      location: 'after' as ToolbarItemLocation,
      widget: 'dxButton' as ToolbarItemComponent,
      name: 'myGridCopy',
      locateInMenu: 'auto' as LocateInMenuMode,
      options: {
        icon: 'copy',
        hint: 'Sao chép',
        disabled: selectedRowIndex.current == -1,
        visible: visibleCopy,
        onClick: function () {

        }
      }
    },
    {
      location: 'after' as ToolbarItemLocation,
      widget: 'dxButton' as ToolbarItemComponent,
      name: 'myGridAddRow',
      locateInMenu: 'auto' as LocateInMenuMode,
      options: {
        text: "Thêm",
        icon: 'plus',
        type: 'success',
        hint: "Thêm mới",
        visible: visibleNew,
        onClick: function () {
          addRow();
        }
      }
    },
  ]
  const getToolbarItems = (): any[] => {
    const items: any[] = [
      {
        location: "after" as ToolbarItemLocation,
        widget: "dxButton" as ToolbarItemComponent,
        name: 'myGridRefresh',
        locateInMenu: 'auto' as LocateInMenuMode,
        options: {
          icon: "refresh",
          hint: 'Làm mới dữ liệu',
          onClick: function () {
            (gridRef as RefObject<DataGridRef>).current?.instance().refresh();
          },
        }
      },
      {
        location: 'after' as ToolbarItemLocation,
        widget: 'dxButton' as ToolbarItemComponent,
        name: 'myGridDeleteRow',
        locateInMenu: 'auto' as LocateInMenuMode,
        options: {
          text: "Xóa",
          icon: 'trash',
          type: 'danger',
          hint: "Xoá",
          disabled: selectedRowIndex.current == -1,
          visible: visibleDelete,
          onClick: function () {
            var items_selected = (gridRef as RefObject<DataGridRef>).current?.instance().getSelectedRowsData();
            if (items_selected.length) {
              let result = confirm(`Xác nhận xóa ${items_selected.length} bản ghi đã chọn?`, "Thông báo");
              result.then((dialogResult) => {
                if (dialogResult) {
                  var items_selected = (gridRef as RefObject<DataGridRef>).current?.instance().getSelectedRowsData();
                  var items: any = [];
                  var keyDT = (gridRef as RefObject<DataGridRef>).current?.instance().getDataSource().key();
                  items_selected.forEach(function (value) {
                    if (Array.isArray(keyDT)) {
                      var keyArr: any = {};
                      keyDT.forEach(function (val) {
                        keyArr[val] = value[val];
                      });
                      items.push(keyArr);
                    } else {
                      items.push(value[keyDT]);
                    }
                  });
                  (gridRef as RefObject<DataGridRef>).current?.instance().beginCustomLoading("Đang xử lý ...");
                  let result = PostData(props.url + "/Delete", { items: JSON.stringify(items) });
                  result.then((response: any) => {
                    if (response.Data != null && response.Data.length) {
                      alert(response.Data.join('<br/>'), "Thông báo");
                    } else {
                      triggerToast('Xóa bản ghi thành công', 'success');
                    }
                    (gridRef as RefObject<DataGridRef>).current?.instance().endCustomLoading();
                    (gridRef as RefObject<DataGridRef>).current?.instance().deselectAll();
                    (gridRef as RefObject<DataGridRef>).current?.instance().refresh();
                  });
                  (gridRef as RefObject<DataGridRef>).current?.instance().endCustomLoading();
                }
              });
            } else {
              alert("Vui lòng chọn 1 bản ghi", "Thông báo");
            }

          }
        }
      },
      {
        location: 'after' as ToolbarItemLocation,
        widget: 'dxButton' as ToolbarItemComponent,
        name: 'myGridEditRow',
        locateInMenu: 'auto' as LocateInMenuMode,
        options: {
          text: "Sửa",
          icon: 'edit',
          type: 'default',
          hint: "Sửa",
          disabled: selectedRowIndex.current == -1,
          visible: visibleEdit,
          onClick: function () {
            editRow();
          }
        }
      },
      {
        location: 'after' as ToolbarItemLocation,
        widget: 'dxButton' as ToolbarItemComponent,
        name: 'myGridCopy',
        locateInMenu: 'auto' as LocateInMenuMode,
        options: {
          icon: 'copy',
          hint: 'Sao chép',
          disabled: selectedRowIndex.current == -1,
          visible: visibleCopy,
          onClick: function () {

          }
        }
      },
      {
        location: 'after' as ToolbarItemLocation,
        widget: 'dxButton' as ToolbarItemComponent,
        name: 'myGridAddRow',
        locateInMenu: 'auto' as LocateInMenuMode,
        options: {
          text: "Thêm",
          icon: 'plus',
          type: 'success',
          hint: "Thêm mới",
          visible: visibleNew,
          onClick: function () {
            addRow();
          }
        }
      },
    ];

    return [...items, ...toolbars];
  };
  const refreshToolbar = () => {
    (gridRef as RefObject<DataGridRef>).current?.instance().option('onToolbarPreparing', (e: any) => {
      const toolbarcustom = getToolbarItems();
      toolbarcustom.forEach(item => {
        e.toolbarOptions.items?.unshift(item);
      });
    });
  }
  const addRow = useCallback(() => {
    (gridRef as RefObject<DataGridRef>).current?.instance().addRow();
    (gridRef as RefObject<DataGridRef>).current?.instance().deselectAll();
  }, [gridRef]);

  //edit
  const editRow = useCallback(() => {
    (gridRef as RefObject<DataGridRef>).current?.instance().editRow(selectedRowIndex.current);
    (gridRef as RefObject<DataGridRef>).current?.instance().deselectAll();
  }, [gridRef, selectedRowIndex]);
  //export
  const exportFormats = ['pdf'];
  const onExporting = (e: DataGridTypes.ExportingEvent) => {
    const doc = new jsPDF();
    exportDataGrid({
      jsPDFDocument: doc,
      component: e.component,
      indent: 5,
    }).then(() => {
      doc.save('Companies.pdf');
    });
  };
  //end
  //Toolbar
  const onToolbarPreparing = (e: DataGridTypes.ToolbarPreparingEvent) => {
    const mergedArray = toolbarItem.concat(toolbars);
    mergedArray.forEach(item => {
      e.toolbarOptions.items?.unshift(item);
    });
  }
  //end 

  //onContentReady
  // const onContentReady = (e: ContentReadyEvent) => {
  //   const grid = e.component as any;
  //   if (!grid.__focusedInitialized && grid.getVisibleRows()?.length) {
  //     grid.__focusedInitialized = true;

  //     const firstKey = grid.getVisibleRows()[0]?.key;
  //     if (firstKey !== grid.option("focusedRowKey")) {
  //       grid.option("focusedRowKey", firstKey);
  //       console.log(grid);
  //     }
  //   }


  // }
  // 

  return (
    <div className='flex flex-col h-[85vh]'>
      <div className='Title_content text-lg'>
        {props.Title}
      </div>
      <div className='flex-1 overflow-y-auto'>
        <DataGrid
          dataSource={props.dataSource}
          keyExpr={props.keyExpr}
          showBorders={true}
          columnAutoWidth={true}
          allowColumnReordering={true}
          showColumnLines={true}
          showRowLines={true}
          rowAlternationEnabled={false}
          width='100%'
          height='100%'
          ref={gridRef}
          onExporting={onExporting}
          onToolbarPreparing={onToolbarPreparing}
          onSelectionChanged={selectedChanged}
          allowColumnResizing={true}
          remoteOperations={true}
          focusedRowEnabled={true}
          syncLookupFilterValues={false}
          wordWrapEnabled={true}
          twoWayBindingEnabled={true}
          repaintChangesOnly={true}
        // scrolling= { {showScrollbar: 'always',preloadEnabled: true} }
        >
          {/* columns */}
          <Addcolumn items={props.cols} />
          {/* end */}

          <Paging enabled={true} pageSize={20} />
          <Pager visible={true} showPageSizeSelector={true} allowedPageSizes={allowedPageSizes} />
          <Selection mode={props.selecttion || "multiple"} selectAllMode={"allPages"} showCheckBoxesMode={"onClick"} />
          <SearchPanel visible={true} placeholder="Tra cứu" width={280} />
          <Editing mode={props.modeEditting || "popup"} >
            <Popup title="Thêm mới" showTitle={true} width={width} height={height} />
            <Form>
              <Addcolumn items={props.cols} />
            </Form>
          </Editing>
          <Export enabled={true} formats={exportFormats} allowExportSelectedData={true} />
          {/* <Scrolling mode="virtual" showScrollbar='always' useNative={false} /> or "virtual" | "infinite" */}
          <LoadPanel enabled={true} />
        </DataGrid>
      </div>
    </div>

  )
});
export default Grid_custom;