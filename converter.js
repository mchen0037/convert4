var express = require('express');
var fs = require("node-fs");
var JSZip = require("jszip");
var formidable = require('formidable');
var Promise = require("bluebird");
Promise.promisifyAll(fs);

var files = process.argv[2]
var fields = {
  "modelType": "gbccFlat",
  "nLogoFilename1": files,
  "legacyHubnet": false,
  "allowTabs": false,
  "allowMultipleLayers": false,
  "allowMultipleSelections": false,
  "allowCanvasForeverButtons": false,
  "allowGalleryControls": false,
  "allowTeacherControls": false,
  "allowMirrorControls": false
}

var activityType = fields['modelType'];

fields["legacyHubnet"] = (activityType == "legacyHubnet") ? true : false;
fields["allowTabs"] = (activityType == "legacyHubnet") ? false : true;
var title;
var nlogoFilename1 = undefined;
var nlogoFilename2 = undefined;
switch (activityType) {
 case "legacyHubnet":
   if (files.hubnetfiletoupload) {
     title = files.hubnetfiletoupload.name;
     nlogoFilename1 = files.hubnetfiletoupload.path || "error";
     fields["allowMultipleLayers"] = undefined;
     fields["allowMultipleSelections"] = undefined;
     fields["allowCanvasForeverButtons"] = undefined;
     fields["allowGalleryControls"] = undefined;
     fields["allowTeacherControls"] = true;
     fields["allowMirrorControl"] = true;
   }
   break;
 case "gbccFlat":
   if (files) {
     title = files;
     nlogoFilename1 = files || "error";
   }
    break;
 case "gbccHierarchical":
   if (files.teacherfiletoupload) {
     title = files.teacherfiletoupload.name;
     //console.log(files.teacherfiletoupload.name);
     nlogoFilename1 = files.teacherfiletoupload.path || "error";
   }
   if (files.studentfiletoupload) {
     //console.log(files.studentfiletoupload.name);
     nlogoFilename2 = files.studentfiletoupload.path || "error";
   }
   break;
 default:
   break;
}



var filename = title.substr(0,title.indexOf("."));
var configFile;
var nlogoFile;
var indexFile;
var loginWidgerRange, studentWidgetRange, teacherWidgetRange;
var secondView = [];
var numTeacherWidgets = 0;
var numStudentWidgets = 0;
var arrayIndex, array;
var widgets = ["BUTTON", "SLIDER", "SWITCH", "CHOOSER", "INPUTBOX", "MONITOR", "OUTPUT", "TEXTBOX", "VIEW", "GRAPHICS-WINDOW", "PLOT"];
var viewWidgets = ["VIEW", "GRAPHICS-WINDOW"];
var widget = "";
var zip;
var gbccTeacherArray;
fs.readFileAsync(nlogoFilename1, "utf8").then(function(data) {
 zip = new JSZip();
 zip.file(title.replace(/^.*[\\\/]/, ''), data);
  if (activityType === "legacyHubnet") {
    var sanitizedFileContents = data.toString();
    array = sanitizedFileContents.split("\n");
    nlogoFile = "";
    arrayIndex = 0;
    var newWidget = false;
    var lastWidgetType = "";
    var label;
    var widgetList = [];
    for(i in array) {
      // buttons on the client need a client-procedure, to avoid a console error
      if (arrayIndex === 0 && array[i] === "@#$#@#$#@") { nlogoFile = nlogoFile + "\n\nto client-procedure\nend\n"; }
      nlogoFile += array[i] + "\n";
      if (arrayIndex === 1) { if (widgets.indexOf(array[i]) > -1) { numTeacherWidgets++; } }
      if (arrayIndex === 8) {
        if ((widgets.indexOf(array[i]) > -1) || (array[i]==="@#$#@#$#@")) {
          if ((array[i] != "VIEW") && (array[i]!="@#$#@#$#@")) { numStudentWidgets++; }
          switch (lastWidgetType) {
            case "BUTTON":
              widget = widget.substr(0,widget.lastIndexOf("NIL"))+"NIL\nNIL\nNIL\n"+widget.lastIndexOf("NIL")+"\n\n";
              widget = widget.replace("NIL","client-procedure");
              if (widget.split("NIL").length === 5) { widget = widget.replace("NIL\nNIL","NIL\nNIL\nNIL"); }
              break;
            case "MONITOR":
              widget = widget.substr(0,widget.indexOf("NIL"))+'""'+"\n0\n1\n11\n";
              //widget = widget.replace("NIL",label+"\n0");
              break;
            case "CHOOSER":
              var widgetLines = widget.split("\n");
              widgetLines[7]  = widgetLines[7].replace(/\\"/g, "\"");
              widget          = widgetLines.join("\n");
              break;
            case "VIEW":
              var widgetParts =  widget.split("\n");
              secondView.push(parseInt(widgetParts[1]));
              secondView.push(parseInt(widgetParts[2]));
              secondView.push(parseInt(widgetParts[3]));
              secondView.push(parseInt(widgetParts[4]));
              widget = "";
              break;
          }
          if ((widget != "") && (viewWidgets.indexOf(lastWidgetType) === -1)) {
            widgetList.push(widget);
            widget = "";
          }
          lastWidgetType = array[i];
          label = array[(parseInt(i) + 5).toString()];
        }
        widget += array[i] + "\n";
      }
      if (array[i] === "@#$#@#$#@") { arrayIndex++; }
    }
    teacherWidgetRange = [0, numTeacherWidgets - 1];
    studentWidgetRange = (numStudentWidgets === 0) ? teacherWidgetRange : [numTeacherWidgets, numTeacherWidgets + numStudentWidgets - 1];
    loginWidgetRange = [(numTeacherWidgets + numStudentWidgets), (numTeacherWidgets + numStudentWidgets)];
    var oldNlogoFile = nlogoFile;
    array = oldNlogoFile.toString().split("\n");
    nlogoFile = "";
    arrayIndex = 0;
    for (i in array) {
      if (array[i] === "@#$#@#$#@") {
        arrayIndex++;
        if (arrayIndex === 2) {
          for (var j=0; j<widgetList.length; j++) {
            nlogoFile += widgetList[j] + "\n";
          }
        }
      }
      nlogoFile += array[i] + "\n";
    }
  } else {
    //console.log("uploading first file");
    array = data.toString().split("\n");
    gbccTeacherArray = array;
    arrayIndex = 0;
    for(i in array) {
      if (arrayIndex === 1) { if (widgets.indexOf(array[i]) > -1) { numTeacherWidgets++; } }
      if (array[i] === "@#$#@#$#@") { arrayIndex++; }
    }
    teacherWidgetRange = [0, numTeacherWidgets - 1];
    studentWidgetRange = teacherWidgetRange;
    loginWidgetRange = [numTeacherWidgets, numTeacherWidgets];
    nlogoFile = "";
    arrayIndex = 0;
    for (i in array) {
      if (array[i] === "@#$#@#$#@") {
        arrayIndex++;
      }
      nlogoFile += array[i] + "\n";
    }
  }
}).then(function() {
  if (nlogoFilename2 === undefined) { nlogoFilename2 = nlogoFilename1; }; //secondView = 'false'; }
  fs.readFileAsync(nlogoFilename2, "utf8").then(function(data) {
    if (activityType === "gbccHierarchical") {
      zip.file(title+"-student", data);
      array = data.toString().split("\n");
      arrayIndex = 0;
      nlogoCode = "";
      widgetCode = "";
      var graphicsWindowPosition = 0;
      for(i in array) {
        if ((arrayIndex === 0) && (array[i] != "@#$#@#$#@")) {
          nlogoCode += array[i] + "\n";
        }
        if (arrayIndex === 1) {
          if (widgets.indexOf(array[i]) > -1) { numStudentWidgets++; }
          if (graphicsWindowPosition > 0 && graphicsWindowPosition < 6) {
            if (graphicsWindowPosition > 1) { secondView+= ", "; }
            secondView+= array[i];
            graphicsWindowPosition++;
          }
          if (graphicsWindowPosition === 5) {
            secondView+= "";
            graphicsWindowPosition = 6;
          }
          if (graphicsWindowPosition === 6 && array[i].length === 0) {
            graphicsWindowPosition = 0;
          }
          if (array[i] === "GRAPHICS-WINDOW") {
            graphicsWindowPosition = 1;
            secondView ="";
          }
          if ((array[i] != "@#$#@#$#@") && (graphicsWindowPosition === 0)) {
            widgetCode += array[i] + "\n";
          }
        }
        if (array[i] === "@#$#@#$#@") { arrayIndex++; }
      }
      studentWidgetRange = (numStudentWidgets === 0) ? teacherWidgetRange : [numTeacherWidgets, numTeacherWidgets + numStudentWidgets - 1];
      loginWidgetRange = [(numTeacherWidgets + numStudentWidgets), (numTeacherWidgets + numStudentWidgets)];
      nlogoFile = "";
      array = gbccTeacherArray;
      arrayIndex = 0;
      for (i in array) {
        if (array[i] === "@#$#@#$#@") {
          arrayIndex++;
          if (arrayIndex === 1) { //console.log(nlogoFile);
            nlogoFile += nlogoCode; }
          if (arrayIndex === 2) { //console.log(nlogoFile);
            nlogoFile += widgetCode; }
        }
        nlogoFile += array[i] + "\n";
      }
    }
}).then(function() {
fs.readFileAsync("convert4/gbcc/config.json", "utf8").then(function(data) {
   var array = data.toString().split("\n");
   var configData = data;
   configFile = "";
   for(var i in array) {
     configFile += array[i] + "\n";
     if (array[i].includes("loginComponents"))   { configFile += '      "componentRange": [' +loginWidgetRange + "]\n" }
     if (array[i].includes("teacherComponents")) { configFile += '      "componentRange": [' +teacherWidgetRange + "]\n" }
     if (array[i].includes("studentComponents")) { configFile += '      "componentRange": [' +studentWidgetRange + "]\n" }
     if (array[i].includes("galleryJs")) {
       configFile += (fields["allowTabs"]) ?                 '    "allowTabs": true, \n' :                 '    "allowTabs": false, \n';
       configFile += (fields["allowMultipleLayers"]) ?       '    "allowMultipleLayers": true, \n' :       '    "allowMultipleLayers": false, \n';
       configFile += (fields["allowMultipleSelections"]) ?   '    "allowMultipleSelections": true, \n' :   '    "allowMultipleSelections": false, \n';
       configFile += (fields["allowCanvasForeverButtons"]) ? '    "allowCanvasForeverButtons": true, \n' : '    "allowCanvasForeverButtons": false, \n';
       configFile += (fields["allowGalleryControls"]) ?      '    "allowGalleryControls": true, \n' :      '    "allowGalleryControls": false, \n';
       configFile += (fields["allowTeacherControls"]) ?      '    "allowTeacherControls": true, \n' :      '    "allowTeacherControls": false, \n';
       configFile += (fields["allowMirrorControl"]) ?        '    "allowMirrorControl": true, \n' :        '    "allowMirrorControl": false, \n';
       configFile += (fields["legacyHubnet"]) ?              '    "legacyHubnet": true, \n' :              '    "legacyHubnet": false, \n';
       configFile +=                                         '    "secondView": [' +secondView +   ']\n';
     }
   }
}).then(function() {
fs.readFileAsync("convert4/gbcc/index1.html", "utf8").then(function(data) {
   indexFile = "";
   var array = data.toString().split("\n");
   for (i in array) { indexFile += array[i] + "\n"; }
   //indexFile += "\ndocument.title = '"+title+"';\n</script>";
   indexFile += "\n<script type='text/nlogo' id='nlogo-code' data-filename='"+title+"'>";
   indexFile += nlogoFile;
}).then(function() {
fs.readFileAsync("convert4/gbcc/index3.html", "utf8").then(function(data) {
   var array = data.toString().split("\n");
   for (i in array) { indexFile += array[i] + "\n"; }
}).then(function() {
  //console.log(configFile);
  zip.file("config.json", configFile);
  zip.file("index.html", indexFile);

  fs.readFileAsync("convert4/gbcc/app/gbcc/exportworld.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/exportworld.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/font-awesome.min.css", "utf8").then(function(data) {
  	zip.file("app/gbcc/font-awesome.min.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/fontawesome-webfont.eot").then(function(data) {
  	zip.file("app/gbcc/fontawesome-webfont.eot", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/fontawesome-webfont.svg").then(function(data) {
  	zip.file("app/gbcc/fontawesome-webfont.svg", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/fontawesome-webfont.ttf").then(function(data) {
  	zip.file("app/gbcc/fontawesome-webfont.ttf", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/fontawesome-webfont.woff").then(function(data) {
  	zip.file("app/gbcc/fontawesome-webfont.woff", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/fontawesome-webfont.woff2").then(function(data) {
  	zip.file("app/gbcc/fontawesome-webfont.woff2", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/gbcc-client.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/gbcc-client.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/gbcc-events.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/gbcc-events.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/gbcc-export.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/gbcc-export.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/gbcc-files.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/gbcc-files.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/gbcc-gallery.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/gbcc-gallery.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/gbcc-gallery.css", "utf8").then(function(data) {
  	zip.file("app/gbcc/gbcc-gallery.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/gbcc-interface.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/gbcc-interface.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/graph.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/graph.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/html2canvas.min.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/html2canvas.min.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/gbcc-image.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/gbcc-image.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/jquery.min.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/jquery.min.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/maps.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/maps.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-api.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/physics-api.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-box2d.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/physics-box2d.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a1.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a1.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a2.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a2.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a3.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a3.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a4.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a4.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a5.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a5.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a6.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a6.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a7.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a7.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a8.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a8.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a22.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a22.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics-ui/a23.png").then(function(data) {
  	zip.file("app/gbcc/physics-ui/a23.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/physics.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/physics.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/style.css", "utf8").then(function(data) {
  	zip.file("app/gbcc/style.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/alert.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/alert.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/babybehaviorspace.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/babybehaviorspace.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/button.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/button.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/checkbox.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/checkbox.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/chooser.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/chooser.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/chosen.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/chosen.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/chosen.jquery.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/chosen.jquery.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/classes.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/classes.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/code-container.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/code-container.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/code-editor.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/code-editor.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/codemirror-mode.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/codemirror-mode.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/codemirror.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/codemirror.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/codemirror.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/codemirror.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/color-input.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/color-input.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/colors.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/colors.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/config-shims.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/config-shims.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/console.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/console.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/context-menu.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/context-menu.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/default-shapes.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/default-shapes.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/dialog.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/dialog.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/dialog.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/dialog.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/draggable.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/draggable.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/draw-shape.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/draw-shape.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/dropdown.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/dropdown.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/edit-form.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/edit-form.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/element-overrides.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/element-overrides.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/event-traffic-control.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/event-traffic-control.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/export-data.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/export-data.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/exporting.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/exporting.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/FileSaver.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/FileSaver.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/font-size.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/font-size.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/global-noisy-things.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/global-noisy-things.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/handle-context-menu.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/handle-context-menu.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/handle-widget-selection.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/handle-widget-selection.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/help-dialog.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/help-dialog.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/highcharts.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/highcharts.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/highcharts(1).js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/highcharts(1).js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/html-sanitizer-minified.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/html-sanitizer-minified.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/info.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/info.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/initialize-ui.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/initialize-ui.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/input.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/input.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/jquery.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/jquery.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/jquery.min.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/jquery.min.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/keywords.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/keywords.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/label.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/label.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/labeled-input.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/labeled-input.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/link-drawer.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/link-drawer.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/markdown.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/markdown.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/models.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/models.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/monitor.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/monitor.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/mousetrap.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/mousetrap.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/netlogo-engine.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/netlogo-engine.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/netlogo-syntax.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/netlogo-syntax.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/netlogoweb.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/netlogoweb.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/new-model.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/new-model.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/output.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/output.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/plot.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/plot.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/print-area.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/print-area.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/ractive.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/ractive.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/resizer.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/resizer.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/search.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/search.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/searchcursor.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/searchcursor.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/session-lite.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/session-lite.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/set-up-widgets.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/set-up-widgets.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/simple.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/simple.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/skeleton.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/skeleton.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/slider.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/slider.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/spacer.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/spacer.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/spinner.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/spinner.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/switch.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/switch.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/theme.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/theme.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/tick-counter.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/tick-counter.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/title.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/title.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/topbar.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/topbar.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/tortoise-compiler.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/tortoise-compiler.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/tortoise.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/tortoise.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/tortoise.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/tortoise.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/ui-editor.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/ui-editor.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/variable.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/variable.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/view-controller.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/view-controller.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/view.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/view.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/web.html", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/web.html", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/widget-controller.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/widget-controller.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/widget.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/widget.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/widgets.css", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/widgets.css", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/geogebra-default.ggb").then(function(data) {
  	zip.file("geogebra-default.ggb", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/ocean.png").then(function(data) {
  	zip.file("ocean.png", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/package.json", "utf8").then(function(data) {
  	zip.file("package.json", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/readme.md", "utf8").then(function(data) {
  	zip.file("readme.md", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/server.js", "utf8").then(function(data) {
  	zip.file("server.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/async-user-dialog.js").then(function(data) {
  	zip.file("app/netlogoweb/async-user-dialog.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/jscolor.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/jscolor.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/synchrodecoder.min.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/synchrodecoder.min.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/localforage.min.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/localforage.min.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/geogebra_defaults2d.xml", "utf8").then(function(data) {
  	zip.file("app/gbcc/geogebra_defaults2d.xml", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/geogebra_defaults3d.xml", "utf8").then(function(data) {
  	zip.file("app/gbcc/geogebra_defaults3d.xml", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/geogebra_javascript.js", "utf8").then(function(data) {
  	zip.file("app/gbcc/geogebra_javascript.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/gbcc/geogebra_thumbnail.png").then(function(data) {
  	zip.file("app/gbcc/geogebra_thumbnail.png ", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/comment.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/comment.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/show-hint.js", "utf8").then(function(data) {
  	zip.file("app/netlogoweb/show-hint.js", data);
  }).then(function() {
  fs.readFileAsync("convert4/gbcc/app/netlogoweb/show-hint.css").then(function(data) {
  	zip.file("app/netlogoweb/show-hint.css", data);
  }).then(function() {
    zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
    .pipe(fs.createWriteStream(filename+'.zip'))
  }).catch(function(e) {
    res.sendfile('index.html');
    console.error(e.stack);
  }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); });
});

console.log("converter.js: finished")
