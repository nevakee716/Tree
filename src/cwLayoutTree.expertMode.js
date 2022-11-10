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

  // manage Expert Mode
  cwLayoutTree.prototype.manageExpertModeButton = function (event) {
    var self = this;
    cwApi.CwAsyncLoader.load("angular", function () {
      if (self.expertMode === true) {
        self.expertMode = false;
        event.target.title = $.i18n.prop("activate_expert_mode");
        event.target.classList.remove("selected");
        cwAPI.CwPopout.hide();
      } else {
        self.expertMode = true;
        event.target.title = $.i18n.prop("deactivate_expert_mode");
        event.target.classList.add("selected");
        cwApi.CwPopout.showPopout($.i18n.prop("expert_mode"));

        cwApi.CwPopout.setContent(self.createExpertModeElement());
        self.setEventForExpertMode();
        self.selectTab("treeNodes");
        self.selectTab("treeNodes");
        cwApi.CwPopout.onClose(function () {
          self.expertMode = false;
          event.target.title = $.i18n.prop("activate_expert_mode");
        });
      }
    });
  };

  // manage Expert Mode
  cwLayoutTree.prototype.createExpertModeElement = function () {
    var self = this;
    var tab = [];
    var tabs = ["treeNodes", "treeGroups"]; //, "general"];
    var expertModeConfig = document.createElement("div");
    expertModeConfig.className = "cwLayoutTreeExpertModeConfig";
    expertModeConfig.id = "cwLayoutTreeExpertModeConfig" + this.nodeID;

    var cwLayoutTreeExpertModeContainerTab = document.createElement("div");
    cwLayoutTreeExpertModeContainerTab.className = "cwLayoutTreeExpertModeContainerTab";
    cwLayoutTreeExpertModeContainerTab.id = "cwLayoutTreeExpertModeContainerTab" + this.nodeID;
    expertModeConfig.appendChild(cwLayoutTreeExpertModeContainerTab);

    var expertModeContainer = document.createElement("div");
    expertModeContainer.className = "cwLayoutTreeExpertModeContainer";
    expertModeContainer.id = "cwLayoutTreeExpertModeContainer";

    var treeContainer = document.createElement("div");
    treeContainer.id = "cwLayoutTreeExpertModeNodesConfigTree" + this.nodeID;
    treeContainer.className = "cwLayoutTreeExpertModeNodesConfigTree";

    expertModeConfig.appendChild(treeContainer);
    expertModeConfig.appendChild(expertModeContainer);

    tabs.forEach(function (t) {
      let tab = document.createElement("div");
      tab.className = "cwLayoutTreeExpertModeTabs";
      tab.id = t;
      tab.innerText = $.i18n.prop(t);
      cwLayoutTreeExpertModeContainerTab.appendChild(tab);
    });
    let tabElem = document.createElement("div");
    tabElem.className = "cwLayoutTreeExpertModeTabs";
    tabElem.id = "saveconfiguration";
    tabElem.innerHTML = '<i class="fa fa-floppy-o" aria-hidden="true"></i>';
    cwLayoutTreeExpertModeContainerTab.appendChild(tabElem);

    return expertModeConfig;
  };

  cwLayoutTree.prototype.selectTab = function (id) {
    var self = this,
      loader = cwApi.CwAngularLoader;
    loader.setup();

    let treeElem = document.getElementById("cwLayoutTreeExpertModeNodesConfigTree" + this.nodeID);
    if (id === "saveconfiguration") {
      var cpyConfig = $.extend(true, {}, this.config);
      cpyConfig.inclusions = undefined;
      cwAPI.customLibs.utils.copyToClipboard(JSON.stringify(cpyConfig));
      treeElem.style.display = "none";
    } else if (id === "treeNodes") {
      treeElem.style.display = "block";
    } else {
      treeElem.style.display = "none";
    }
    let templatePath = cwAPI.getCommonContentPath() + "/html/cwLayoutTree/" + id + ".ng.html" + "?" + Math.random();
    this.unselectTabs();
    let t = document.querySelector("#" + id);
    t.className += " selected";

    var $container = $("#cwLayoutTreeExpertModeContainer");

    loader.loadControllerWithTemplate(t.id, $container, templatePath, function ($scope) {
      $scope.metamodel = cwAPI.mm.getMetaModel();
      $scope.config = self.config;
      $scope.cwApi = cwApi;

      $scope.toggle = function (c, e) {
        if (c.hasOwnProperty(e)) delete c[e];
        else c[e] = true;
      };

      $scope.toggleArray = function (c, e) {
        var i = c.indexOf(e);
        if (i === -1) c.push(e);
        else c.splice(i, 1);
      };

      $scope.removeArray = function (c, e) {
        var i = c.indexOf(e);
        if (i !== -1) c.splice(i, 1);
      };

      $scope.isSelected = function (c, e) {
        var i = c.indexOf(e);
        if (i === -1) return "";
        else return "selected";
      };

      $scope.updateSpecificGroups = function (sGroup, nodeID) {
        $scope.ng.config.propertyMapping.forEach((group) => {
          if (group.name === sGroup) {
            $scope.toggleArray(group.nodeIDs, nodeID);
          } else {
            $scope.removeArray(group.nodeIDs, nodeID);
          }
        });
        $scope.updateTree();
      };

      $scope.addGroup = function () {
        ng.config.propertyMapping.push({ name: "new Group", nodeIDs: [] });
      };

      $scope.deleteGroup = function (index) {
        ng.config.propertyMapping.splice(index, 1);
        $scope.updateTree();
      };

      $scope.isSelected = function (c, e) {
        var i = c.indexOf(e);
        if (i === -1) return "";
        else return "selected";
      };

      $scope.updateTree = self.updateTree.bind(self);

      $scope.ng = {};
      $scope.ng.config = self.config;
      $scope.ng.cwAPIPivotUnfind = self.cwAPIPivotUnfind;
      $scope.ng.propertiesScriptnameList = self.propertiesScriptnameList;
      self.apply = function () {
        $scope.$apply();
      };

      if (self["controller_" + t.id] && $scope.config) self["controller_" + t.id]($container, templatePath, $scope);
    });
  };
  cwLayoutTree.prototype.setEventForExpertMode = function () {
    var self = this;
    let matches = document.querySelectorAll(".cwLayoutTreeExpertModeTabs");
    for (let i = 0; i < matches.length; i++) {
      let t = matches[i];
      t.addEventListener("click", function (event) {
        self.selectTab(t.id);
      });
    }
  };

  cwLayoutTree.prototype.unselectTabs = function (tabs) {
    let matches = document.querySelectorAll(".cwLayoutTreeExpertModeTabs");
    for (let i = 0; i < matches.length; i++) {
      let t = matches[i];
      t.className = t.className.replaceAll(" selected", "");
    }
  };

  cwLayoutTree.prototype.bootstrapFilter = function (id, value) {
    window.setTimeout(function (params) {
      $("#" + id).selectpicker();
      $("#" + id).selectpicker("val", value);
    }, 1000);
  };

  cwLayoutTree.prototype.nodeIDToFancyTree = function (node, noLoop) {
    var self = this;
    var exportNode = {};
    if (node === undefined) {
      node = this.viewSchema.NodesByID[this.nodeID];
    }
    exportNode.text = node.NodeName;
    exportNode.NodeID = node.NodeID;
    exportNode.children = [];
    exportNode.objectTypeScriptName = node.ObjectTypeScriptName;
    exportNode.SortedChildren = node.SortedChildren;
    exportNode.state = {
      opened: true,
    };

    if (noLoop !== true) {
      node.SortedChildren.forEach(function (n) {
        exportNode.children.push(self.nodeIDToFancyTree(self.viewSchema.NodesByID[n.NodeId]));
      });
    }

    return exportNode;
  };

  cwLayoutTree.prototype.updateTree = function () {
    this.getDiagramMaterial(() => this.parse());
  };

  cwLayoutTree.prototype.controller_treeNodes = function ($container, templatePath, $scope) {
    var self = this;
    $scope.treeID = "cwLayoutTreeExpertModeNodesConfigTree" + this.nodeID;
    $scope.optionString = {};

    $scope.updateLeftBranch = function (nodeId) {
      if ($scope.ng.leftBox) self.config.nodeIdLeft = nodeId;
      else self.config.nodeIdLeft = "";
      self.updateTree();
    };

    $scope.updateRightBranch = function (nodeId) {
      if ($scope.ng.rightBox) self.config.nodeIdRight = nodeId;
      else self.config.nodeIdLeft = "";
      self.updateTree();
    };

    $scope.updateNodeCheck = function (config, nodeId) {
      let index = self.config[config].indexOf(nodeId);
      if (index === -1) {
        self.config[config].push(nodeId);
      } else {
        self.config[config].splice(index, 1);
      }
      self.updateTree();
    };

    $scope.updateValues = function () {
      console.log($scope.values);
      $scope.values = $scope.values.filter(function (v) {
        return !!v;
      });
    };

    var tmpsource = [],
      source = [],
      self = this;
    let q = cwApi.getQueryStringObject();
    let tab = "tab0";

    if (q.cwtabid) tab = q.cwtabid;
    if (this.viewSchema.Tab && this.viewSchema.Tab.Tabs) {
      this.viewSchema.Tab.Tabs.forEach(function (t) {
        if (t.Id === tab) {
          t.Nodes.forEach(function (n) {
            source.push(self.nodeIDToFancyTree(self.viewSchema.NodesByID[n]));
          });
        }
      });
    } else {
      self.viewSchema.RootNodesId.forEach(function (n) {
        source.push(self.nodeIDToFancyTree(self.viewSchema.NodesByID[n]));
      });
    }

    if (cwApi.isIndexPage() === false) {
      tmpsource.push(self.nodeIDToFancyTree(self.viewSchema.NodesByID[self.viewSchema.RootNodesId[0]]));
      tmpsource[0].children = source;
      source = tmpsource;
    }

    $scope.loadtree = function () {
      // define right click action on the jstree
      function contextMenu(node) {
        var items = {};
        var tree = $("#" + $scope.treeID).jstree(true);
        if (node.type !== "file") {
          items.createStep = {
            label: "Create Step",
            icon: "fa fa-plus",
            action: function (questo) {
              let newNodeID = tree.create_node(
                node,
                {
                  text: "Step",
                  parent: "node.original.NodeName",
                  type: "file",
                  NodeID: node.original.NodeID,
                  objectTypeScriptName: node.original.objectTypeScriptName,
                },
                node.children.length - node.original.SortedChildren.length
              );
              if ($scope.config.nodes[node.original.NodeID] === undefined) $scope.config.nodes[node.original.NodeID] = { steps: {} };
              $scope.config.nodes[node.original.NodeID].steps[newNodeID] = { cds: "{name}" };
            },
          };
        } else {
          items.renameStep = {
            label: "Rename Step",
            icon: "fa fa-pencil",
            action: function (obj) {
              tree.edit(node);
            },
          };
          items.deleteStep = {
            label: "Delete Step",
            icon: "fa fa-trash",
            action: function (obj) {
              tree.delete_node($(node));
              delete $scope.config.nodes[node.original.NodeID].steps[node.id];
              self.updateTimeline();
            },
          };
        }
        return items;
      }

      $(".cwLayoutTreeExpertModeNodesConfigTree")
        // onselect event
        .on("changed.jstree", function (e, data) {
          if (data.node && data.node.original) {
            $scope.ng.nodeID = data.node.original.NodeID;
            let node = self.viewSchema.NodesByID[$scope.ng.nodeID];
            $scope.ng.PropertiesSelected = node.PropertiesSelected.map(function (n) {
              return cwAPI.mm.getProperty(node.ObjectTypeScriptName, n);
            });
            if (data.node.type === "default") {
              $scope.ng.selectedNode = data.node.original;
              $scope.ng.selectedStep = undefined;

              $scope.$apply();
            }
          }
        })
        .jstree({
          core: {
            data: source,
            check_callback: true,
          },
          types: {
            default: {
              valid_children: ["file"],
            },
            file: {
              icon: "fa fa-cube",
              valid_children: [],
            },
          },
          plugins: ["contextmenu", "types"],
          contextmenu: {
            select_node: false,
            items: contextMenu,
          },
        });
    };
    $scope.loadtree();
  };

  cwApi.cwLayouts.cwLayoutTree = cwLayoutTree;
})(cwAPI, jQuery);
