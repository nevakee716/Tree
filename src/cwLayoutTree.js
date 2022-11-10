/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery */
(function (cwApi, $) {
  "use strict";
  if (cwApi && cwApi.cwLayouts && cwApi.cwLayouts.cwLayoutTree) {
    var cwLayoutTree = cwApi.cwLayouts.cwLayoutTree;
  } else {
    // constructor
    var cwLayoutTree = function (options, viewSchema) {
      cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema); // heritage
      cwApi.registerLayoutForJSActions(this); // execute le applyJavaScript après drawAssociations
      this.construct(options, viewSchema);
    };
  }

  var uniqueArrayJSON = function (array) {
    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
      for (var j = i + 1; j < a.length; ++j) {
        if (JSON.stringify(a[i]) == JSON.stringify(a[j])) {
          a.splice(j--, 1);
        }
      }
    }

    return a;
  };

  // constructor
  cwLayoutTree.prototype.construct = function (options, viewSchema) {
    this.multiLineCount = this.options.CustomOptions["multiLineCount"];
    this.multiLineCount = 5;
    this.maxLength = { downward: {}, upward: {}, height: 0 };
    if (this.options.CustomOptions["horizontalOffset"] !== "") this.maxLength.offset = this.options.CustomOptions["horizontalOffset"];
    else this.maxLength.offset = 20;
    if (this.options.CustomOptions["horizontalSpacingFactor"] !== "") this.linkLength = this.options.CustomOptions["horizontalSpacingFactor"];
    else this.linkLength = 6;

    this.popOut = {};
    this.layoutsByNodeId = {};

    let q = cwApi.getQueryStringObject();
    let tab = "tab0";
    let tmpsource = [],
      source = [];
    if (q.cwtabid) tab = q.cwtabid;
    if (this.viewSchema.Tab && this.viewSchema.Tab.Tabs) {
      this.viewSchema.Tab.Tabs.forEach((t) => {
        if (t.Id === tab) {
          t.Nodes.forEach((n) => {
            source.push(this.nodeIDToFancyTree(viewSchema.NodesByID[n]));
          });
        }
      });
    } else {
      this.viewSchema.RootNodesId.forEach((n) => {
        source.push(this.nodeIDToFancyTree(viewSchema.NodesByID[n]));
      });
    }

    if (cwApi.isIndexPage() === false) {
      tmpsource.push(this.nodeIDToFancyTree(viewSchema.NodesByID[viewSchema.RootNodesId[0]]));
      tmpsource[0].children = source;
      source = tmpsource;
    }
    this.source = source;
    this.getPopOutList(this.options.CustomOptions["popOutList"]);
    try {
      this.config = JSON.parse(this.options.CustomOptions["config"]);
    } catch (e) {
      this.config = { propertyMapping: [], hiddenNodes: [] };
      if (source.length > 1) {
        this.config.nodeIdRight = source[0].NodeID;
        this.config.nodeIdLeft = source[1]?.NodeID;
      } else {
        this.config.nodeIdRight = source[0]?.children[1]?.NodeID ?? "";
        this.config.nodeIdLeft = source[0]?.children[0]?.NodeID;
      }
    }
  };

  cwLayoutTree.prototype.getPopOutList = function (options) {
    if (options) {
      var optionList = options.split("#");
      var optionSplit;

      for (var i = 0; i < optionList.length; i += 1) {
        if (optionList[i] !== "") {
          var optionSplit = optionList[i].split(",");
          this.popOut[optionSplit[0]] = optionSplit[1];
        }
      }
    }
  };

  cwLayoutTree.prototype.getItemDisplayString = function (item) {
    var l,
      getDisplayStringFromLayout = function (layout) {
        return layout.displayProperty.getDisplayString(item);
      };
    if (item.nodeID === this.nodeID) {
      return this.displayProperty.getDisplayString(item);
    }
    if (!this.layoutsByNodeId.hasOwnProperty(item.nodeID)) {
      if (this.viewSchema.NodesByID.hasOwnProperty(item.nodeID)) {
        var layoutOptions = this.viewSchema.NodesByID[item.nodeID].LayoutOptions;
        this.layoutsByNodeId[item.nodeID] = new cwApi.cwLayouts[item.layoutName](layoutOptions, this.viewSchema);
      } else {
        return item.name;
      }
    }
    return getDisplayStringFromLayout(this.layoutsByNodeId[item.nodeID]);
  };

  cwLayoutTree.prototype.getTemplates = function (callback) {
    var self = this;
    var idLoaded = 0;
    if (this.templateIds.size === 0) callback();
    this.templateIds.forEach(function (id) {
      var url = cwApi.getLiveServerURL() + "Diagram/Vector/" + id + "?" + cwApi.getDeployNumber();

      $.getJSON(url, function (json) {
        console.log("template " + id + " loaded");
        if (json.status === "Ok") {
          self.diagramTemplates[id] = json.result;
        } else {
          console.log("Issue when loading template " + id);
        }
        idLoaded = idLoaded + 1;
        if (idLoaded === self.templateIds.size) callback();
      });
    });
  };

  cwLayoutTree.prototype.getDiagramMaterial = function (callback) {
    var self = this;
    this.templateIds = new Set();
    this.config.propertyMapping.forEach((pm) => {
      if (pm.templateDiagram) this.templateIds.add(pm.templateDiagram);
    });
    this.diagramTemplates = {};
    cwAPI.siteLoadingPageStart();
    console.log("get template");
    this.getTemplates(() => {
      console.log("get pictures");
      var self = this;
      let imageToLoad = [];
      let imageLoaded = 0;
      Object.keys(this.diagramTemplates).forEach(function (key) {
        let template = self.diagramTemplates[key];
        Object.keys(template.diagram.paletteEntries).forEach(function (p) {
          let palette = template.diagram.paletteEntries[p];
          if (palette.PictureUuid && imageToLoad.indexOf(palette.PictureUuid) === -1) {
            imageToLoad.push(palette.PictureUuid);
          }
          palette.Regions.forEach(function (region) {
            if (region.PictureUuid && imageToLoad.indexOf(region.PictureUuid) === -1) {
              imageToLoad.push(region.PictureUuid);
            }
            if (region.BandingRows && region.BandingRows.length > 0) {
              region.BandingRows.forEach(function (b) {
                if (b.PictureUuid && imageToLoad.indexOf(b.PictureUuid) === -1) {
                  imageToLoad.push(b.PictureUuid);
                }
              });
            }
          });
        });
      });

      if (imageToLoad.length === 0) callback();

      let picturesPath = cwAPI.getSiteMediaPath() + "images/gallerypictures/";
      if (cwAPI.isLive()) {
        picturesPath = cwAPI.getLiveServerURL() + "pictures/gallerypictures/uuid/";
      }

      function checkAllImagesLoaded() {
        imageLoaded += 1;
        if (imageLoaded === imageToLoad.length) {
          callback();
        }
      }

      imageToLoad.forEach(function (uuid) {
        var image = new Image();
        image.src = picturesPath + uuid + ".png?" + cwApi.getDeployNumber();
        cwApi.CwPictureGalleryLoader.images[uuid] = image;
        image.onload = checkAllImagesLoaded;
        image.onerror = checkAllImagesLoaded;
      });
    });
  };

  cwLayoutTree.prototype.drawAssociations = function (output, associationTitleText, object) {
    this.originalObject = object;
    output.push('<div class="cwLayoutTree" id="cwLayoutTreeWrapper_' + this.nodeID + '">');
    if (cwApi.currentUser.PowerLevel === 1) {
      output.push(
        '<a class="btn page-action no-text fa fa-cogs " class="cwLayoutTreeExpertModeButton" id="cwLayoutTreeExpertMode' +
          this.nodeID +
          '" title="' +
          $.i18n.prop("expertMode") +
          '"></a>'
      );
    }
    output.push('<div class="cwLayoutTreeD3Tree" id="cwLayoutTree_' + this.nodeID + '"></div></div>');
  };

  cwLayoutTree.prototype.multiLine = function (name, size) {
    if (size !== "" && size > 0) {
      var nameSplit = name.split(" ");
      var carry = 0;
      var multiLineName = "";
      for (var i = 0; i < nameSplit.length - 1; i += 1) {
        if (nameSplit[i].length > size || carry + nameSplit[i].length > size) {
          multiLineName += nameSplit[i] + "\n";
          carry = 0;
        } else {
          carry += nameSplit[i].length + 1;
          multiLineName += nameSplit[i] + " ";
        }
      }
      multiLineName = multiLineName + nameSplit[nameSplit.length - 1];

      return multiLineName;
    } else {
      return name;
    }
  };

  cwLayoutTree.prototype.getConfig = function (nodeID) {
    return this.config.propertyMapping.find((pm) => pm.nodeIDs.indexOf(nodeID) !== -1);
  };

  cwLayoutTree.prototype.simplify = function (direction, depth, child, filter, nextFilter) {
    var childrenArray = [];
    var element;
    var nextChild;
    if (child && child.associations === undefined) child.associations = child;

    for (var associationNode in child.associations) {
      if (child.associations.hasOwnProperty(associationNode) && associationNode !== filter) {
        for (var i = 0; i < child.associations[associationNode].length; i += 1) {
          nextChild = child.associations[associationNode][i];
          if (this.config.hiddenNodes.indexOf(associationNode) !== -1) {
            childrenArray = uniqueArrayJSON(childrenArray.concat(this.simplify(direction, depth, nextChild, nextFilter)));
          } else {
            element = {};
            element.name = this.getItemDisplayString(nextChild);
            element.object_id = nextChild.object_id;
            element.objectTypeScriptName = nextChild.objectTypeScriptName;
            let config = this.getConfig(nextChild.nodeID);
            if (config?.propertyMapping) {
              element.faIcon = cwApi.customLibs.utils.getIconAndColorFromItemValue(nextChild, config.propertyMapping);
              element.spreadToEdge = config.spreadToEdge;
              element.dashed = config.dashed;
            } else if (config?.templateDiagram) {
              let errors,
                size = {};

              let image = cwAPI.customLibs.utils.shapeToImage(nextChild, this.diagramTemplates[config.templateDiagram], errors, size);
              element.image = image;
              element.size = size;
              element.name = new Array(Math.floor(element.size.Width * 0.9)).join(" ");
              this.maxLength.height = Math.max(this.maxLength.height, element.size.Height);
            }

            if (this.maxLength.hasOwnProperty(direction) && this.maxLength[direction].hasOwnProperty(depth)) {
              this.maxLength[direction][depth] = Math.max(this.maxLength[direction][depth], element.name.length);
            } else {
              this.maxLength[direction][depth] = element.name.length;
            }

            element.children = this.simplify(direction, depth + 1, nextChild, nextFilter);
            childrenArray.push(element);
          }
        }
      }
    }

    return childrenArray;
  };

  cwLayoutTree.prototype.lookForObjects = function (id, scriptname, child) {
    var childrenArray = [];
    var element;
    var nextChild;
    if (child.objectTypeScriptName === scriptname && child.object_id == id) {
      return child;
    }
    for (var associationNode in child.associations) {
      if (child.associations.hasOwnProperty(associationNode)) {
        for (var i = 0; i < child.associations[associationNode].length; i += 1) {
          nextChild = child.associations[associationNode][i];
          element = this.lookForObjects(id, scriptname, nextChild);
          if (element !== null) {
            return element;
          }
        }
      }
    }
    return null;
  };

  cwLayoutTree.prototype.parse = function () {
    console.log("parse");
    var depth = 0;
    var titleNodeRight, titleNodeLeft;
    var copyObject = $.extend(true, {}, this.originalObject);

    if (cwAPI.isIndexPage()) {
      this.title = this.mmNode.NodeName;
      if (this.config.nodeIdLeft === "") {
        titleNodeRight = this.viewSchema.NodesByID[this.config.nodeIdRight].NodeName;
        this.maxLength["downward"][0] = titleNodeRight.length;
        this.simplifiedJson = {
          downward: {
            direction: "downward",
            title: titleNodeRight,
            name: "origin",
            children: this.simplify("downward", depth + 1, copyObject.associations[this.nodeID]),
          },
        };
      } else if (this.config.nodeIdLeft !== "" && this.config.nodeIdRight !== "") {
        titleNodeLeft = this.viewSchema.NodesByID[this.config.nodeIdRight].NodeName;
        titleNodeRight = this.viewSchema.NodesByID[this.config.nodeIdLeft].NodeName;

        this.maxLength["downward"][0] = titleNodeRight.length;
        this.maxLength["upward"][0] = titleNodeLeft.length;

        this.simplifiedJson = {
          upward: {
            direction: "upward",
            title: titleNodeLeft,
            name: "origin",
            children: this.simplify("upward", depth + 1, copyObject.associations[this.nodeID], null, this.config.nodeIdRight),
          },
          downward: {
            direction: "downward",
            title: titleNodeRight,
            name: "origin",
            children: this.simplify("downward", depth + 1, copyObject.associations[this.nodeID], null, this.config.nodeIdLeft),
          },
        };
      }
    } else {
      this.title = this.getItemDisplayString(copyObject);
      let config = this.getConfig(copyObject.nodeID);
      let element = {};
      element.name = this.getItemDisplayString(copyObject);
      if (config?.propertyMapping) {
        element.faIcon = cwApi.customLibs.utils.getIconAndColorFromItemValue(copyObject, config.propertyMapping);
        element.spreadToEdge = config.spreadToEdge;
        element.dashed = config.dashed;
      } else if (config?.templateDiagram) {
        let errors,
          size = {};

        let image = cwAPI.customLibs.utils.shapeToImage(copyObject, this.diagramTemplates[config.templateDiagram], errors, size);
        element.image = image;
        element.size = size;
        element.name = new Array(Math.floor(element.size.Width * 0.9)).join(" ");
      }
      this.centralElement = element;
      if (this.config.nodeIdLeft === "") {
        titleNodeRight = this.viewSchema.NodesByID[this.config.nodeIdRight].NodeName;
        this.maxLength.downward[0] = titleNodeRight.length;
        this.simplifiedJson = {
          downward: {
            direction: "downward",
            title: this.viewSchema.NodesByID[this.config.nodeIdRight].NodeName,
            name: "origin",
            children: this.simplify("downward", depth + 1, copyObject.associations[this.config.nodeIdRight]),
          },
        };
      } else if (this.config.nodeIdRight !== "" && this.config.nodeIdLeft !== "") {
        titleNodeLeft = this.viewSchema.NodesByID[this.config.nodeIdLeft].NodeName;
        titleNodeRight = this.viewSchema.NodesByID[this.config.nodeIdRight].NodeName;

        this.maxLength.downward[0] = titleNodeRight.length;
        this.maxLength.upward[0] = titleNodeLeft.length;

        this.simplifiedJson = {
          upward: {
            direction: "upward",
            title: this.viewSchema.NodesByID[this.config.nodeIdLeft].NodeName,
            name: "origin",
            children: this.simplify("upward", depth + 1, copyObject.associations[this.config.nodeIdLeft]),
          },
          downward: {
            direction: "downward",
            title: this.viewSchema.NodesByID[this.config.nodeIdRight].NodeName,
            name: "origin",
            children: this.simplify("downward", depth + 1, copyObject.associations[this.config.nodeIdRight]),
          },
        };
      }
    }
    this.createTree();
  };

  cwLayoutTree.prototype.applyJavaScript = function () {
    var that = this;
    var libToLoad = [];

    var expertModeButton = document.getElementById("cwLayoutTreeExpertMode" + this.nodeID);
    if (expertModeButton) {
      expertModeButton.onclick = null;
      expertModeButton.onclick = this.manageExpertModeButton.bind(this);
    }

    if (cwAPI.isDebugMode() === true) {
      that.getDiagramMaterial(() => that.parse());
    } else {
      // AsyncLoad
      cwApi.customLibs.aSyncLayoutLoader.loadUrls(["modules/d3/d3.min.js"], function (error) {
        if (error === null) {
          cwApi.customLibs.aSyncLayoutLoader.loadUrls(["modules/d3Menu/d3Menu.min.js"], function (error) {
            if (error === null) {
              cwAPI.siteLoadingPageStart();
              that.getDiagramMaterial(() => that.parse());
            } else {
              cwAPI.Log.Error(error);
            }
          });
        } else {
          cwAPI.Log.Error(error);
        }
      });
    }
  };

  cwLayoutTree.prototype.createTree = function () {
    console.log("Creating Tree ....");
    this.tree = new cwApi.customLibs.cwD3Tree(d3, this.config);
    cwAPI.siteLoadingPageFinish();
    var menuActions = [];
    var menuAction = {};
    menuAction.title = "Open Pop-Out";
    menuAction.eventName = "openPopOut";
    menuActions.push(menuAction);
    var menuAction2 = {};
    menuAction2.title = "Open ObjectPage";
    menuAction2.eventName = "openObjectPage";
    menuActions.push(menuAction2);
    var menuAction3 = {};
    menuAction3.title = "Open ObjectPage in new Tab";
    menuAction3.eventName = "openObjectPageNewTab";
    menuActions.push(menuAction3);

    var container = document.getElementById("cwLayoutTree_" + this.nodeID);
    container.remove();

    var wrapper = document.getElementById("cwLayoutTreeWrapper_" + this.nodeID);
    container = document.createElement("div");
    container.className = "cwLayoutTreeD3Tree";
    container.id = "cwLayoutTree_" + this.nodeID;

    wrapper.append(container);
    container.addEventListener("openObjectPage", this.openObjectPage.bind(this));
    container.addEventListener("openPopOut", this.openPopOut.bind(this));
    container.addEventListener("openObjectPageNewTab", this.openObjectPageNewTab.bind(this));
    this.tree.drawChart(this.simplifiedJson, container, this.centralElement, this.maxLength, menuActions, this.linkLength);
  };

  cwLayoutTree.prototype.openObjectPage = function (event) {
    var id = event.data.d.object_id;
    var scriptname = event.data.d.objectTypeScriptName;
    var object = this.lookForObjects(id, scriptname, this.originalObject);
    if (object) {
      location.href = this.singleLinkMethod(scriptname, object);
    }
  };

  cwLayoutTree.prototype.openObjectPageNewTab = function (event) {
    var id = event.data.d.object_id;
    var scriptname = event.data.d.objectTypeScriptName;
    var object = this.lookForObjects(id, scriptname, this.originalObject);
    if (object) {
      window.open(this.singleLinkMethod(scriptname, object), "_blank").focus();
    }
  };

  cwLayoutTree.prototype.openPopOut = function (event) {
    var id = event.data.d.object_id;
    var scriptname = event.data.d.objectTypeScriptName;

    var object = this.lookForObjects(id, scriptname, this.originalObject);
    if (this.popOut[scriptname]) {
      cwApi.cwDiagramPopoutHelper.openDiagramPopout(object, this.popOut[scriptname]);
    }
  };

  cwApi.cwLayouts.cwLayoutTree = cwLayoutTree;
})(cwAPI, jQuery);
