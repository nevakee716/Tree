/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */
/*global jQuery http: //bl.ocks.org/shunpochang/66620bad0e6b201f261c*/
(function(cwApi, $) {


    /**
     * Initialize tree chart object and data loading.
     * @param {Object} d3Object Object for d3, injection used for testing.
     */
    var treeD3JS = function(d3Object) {
        this.d3 = d3Object;
        // Initialize the direction texts.
        this.directions = [];
        this.initDrag = false;
    };

    /**
     * Set variable and draw chart.
     */
    treeD3JS.prototype.drawChart = function(jsonObject,container,title,maxLength,menuActions) {
        var self = this;
        this.menu = [];
        for(var iAction in menuActions) (function(iAction) {
            var eventName = menuActions[iAction].eventName;
            var menu = {
                title: menuActions[iAction].title,
                action: function(elm, d, i) {
                    var newEvent = document.createEvent('Event');
                    var data = {};
                    data.elm = elm;
                    data.d = d;
                    data.i = i;
                    newEvent.data = data;
                    newEvent.initEvent(eventName, true, true);
                    container.dispatchEvent(newEvent);
                }
            };
            self.menu.push($.extend(true, {}, menu));

        }) (iAction);


        if(jsonObject.hasOwnProperty('upward')){
            this.directions.push('upward');
        }
        if(jsonObject.hasOwnProperty('downward')){
            this.directions.push('downward');
        }

        // First get tree data for both directions.
        this.maxLength = maxLength;
        this.title = title;
        this.treeData = {};
        this.container = container;
        var self = this;
        self.directions.forEach(function(direction) {
            self.treeData[direction] = jsonObject[direction];
        });
        self.graphTree(self.getTreeConfig());
    };

    /**
     * Get tree dimension configuration.
     * @return {Object} treeConfig Object containing tree dimension size
     *     and central point location.
     */
    treeD3JS.prototype.getTreeConfig = function() {
        var treeConfig = {
            'margin': {
                'top': 10,
                'right': 5,
                'bottom': 0,
                'left': 30
            }
        };
        var container = this.container;
        var height = window.innerHeight - container.getBoundingClientRect().top;
        var width = container.clientWidth;
        // This will be the maximum dimensions
        treeConfig.chartWidth = (width - treeConfig.margin.right -
            treeConfig.margin.left);
        treeConfig.chartHeight = (height - treeConfig.margin.top -
            treeConfig.margin.bottom);
        treeConfig.centralHeight = treeConfig.chartHeight / 2;
        treeConfig.centralWidth = treeConfig.chartWidth / 2;
        treeConfig.linkLength = 4; 
        treeConfig.duration = 400;
        return treeConfig;
    };

    /**
     * Graph tree based on the tree config.
     * @param {Object} config Object for chart dimension and central location.
     */

    treeD3JS.prototype.graphTree = function(config) {
        var self = this;
        var d3 = this.d3;
        var linkLength = config.linkLength;
        var duration = config.duration;
        // id is used to name all the nodes;
        var id = 0;
        var diagonal = d3.svg.diagonal()
            .projection(function(d) {
                return [d.y, d.x];
            });
        var zoom = d3.behavior.zoom()
            .scaleExtent([0.1, 2])
            .on('zoom', redraw);
        var svg = d3.select(this.container)
            .append('svg')
            .attr('width',
                '100%')
            .attr('height',
                config.chartHeight + config.margin.top + config.margin.bottom)
            //.on('mousedown', disableRightClick)
            .call(zoom)
            .on('dblclick.zoom', null);
        var treeG = svg.append('g')
            .attr('transform',
                'translate(' + 0 + ',' + 0 + ')');
        treeG.append('text').text(this.title)
            .attr('class', 'centralText')
            .attr('x', config.centralWidth)
            .attr('y', config.centralHeight + 40)
            .attr('text-anchor', 'middle');
        // Initialize the tree nodes and update chart.
        for (var d in this.directions) {
            var direction = this.directions[d];
            var data = self.treeData[direction];
            data.x0 = config.centralWidth;
            data.y0 = config.centralHeight;
            // Hide all children nodes other than direct generation.
            data.children.forEach(collapse);
            update(data, data, treeG,this.maxLength);
        }

        /**
         * Update nodes and links based on direction data.
         * @param {Object} source Object for current chart distribution to identify
         *    where the children nodes will branch from.
         * @param {Object} originalData Original data object to get configurations.
         * @param {Object} g Handle to svg.g.
         */
        function update(source, originalData, g,maxLength) {
            // Set up the upward vs downward separation.
            var direction = originalData['direction'];
            var forUpward = direction == 'upward';
            var node_class = direction + 'Node';
            var link_class = direction + 'Link';
            var downwardSign = (forUpward) ? -1 : 1;
            var nodeColor = (forUpward) ? '#37592b' : '#8b4513';
            // Reset tree layout based on direction, since the downward chart has
            // way too many nodes to fit in the screen, while we want a symmetric
            // view for upward chart.
            var nodeSpace = 20;
            var tree = d3.layout.tree().sort(sortByDate).nodeSize([nodeSpace, nodeSpace]);
            if (forUpward) {
                //tree.size([config.chartWidth, config.chartHeight]);
            }
            var nodes = tree.nodes(originalData);
            var links = tree.links(nodes);
            // Offset x-position for downward to view the left most record.
            var offsetX = 0;
            var centralChild,nextCentralChild;

            function isOdd(num) { return num % 2;}

            if(forUpward && originalData.name === 'origin' && originalData.children && originalData.children.length !== 0) {
                if(!isOdd(originalData.children.length)) { // pair
                    offsetX = 0;
                } else {
                    centralChild = originalData.children[originalData.children.length/2 - 0.5]; // impair
                    offsetX = centralChild.x;
                }
            }

            var originIsPresent = false;
            // Normalize for fixed-depth.
            nodes.forEach(function(d) {
                if(originIsPresent) {
                    d.x = d.x + config.centralHeight ;
                    if(forUpward){
                        d.x = d.x - offsetX ;
                    }
                } else {
                    d.x = d.x;  
                }


                // calculate horizontal position
                var offsetY = downwardSign * 40;

                var lenght = 0;

                if(d.depth !== 0) {
                    for (var i = 1; i < d.depth + 1; i += 1) {
                        lenght += maxLength[direction][i-1] ;
                    }
                }

                d.y = downwardSign * (lenght * linkLength + d.depth* maxLength.offset) + config.centralWidth  + offsetY;
                //d.x = (originIsPresent) ? (d.x - offsetX + config.centralHeight) : (d.x - offsetX);
                // Position for origin node.
                if (d.name == 'origin') {
                    originIsPresent = true;
                    d.y = config.centralWidth + downwardSign * 40;
                    d.x = config.centralHeight;
                }
            });

            // Update the node.
            var node = g.selectAll('g.' + node_class)
                .data(nodes, function(d) {
                    return d.id || (d.id = ++id);
                });
                
            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append('g')
                .attr('class', node_class)
                .attr('transform', function(d) {
                    return 'translate(' + source.y0 + ',' + source.x0 + ')';
                })
                .style('cursor', function(d) {
                    return (d.children || d._children) ? 'pointer' : '';
                })
                .on('click', click)
                .on('contextmenu', d3.contextMenu(self.menu));
            nodeEnter.append('circle')
                .attr('r', 1e-6);
            // Add Text stylings for node main texts
            nodeEnter.append('text')
                .attr('x', function(d) {
                    return forUpward ? -10 : 10;
                })
                .attr('dy', '.35em')
                .attr('text-anchor', function(d) {
                    return forUpward ? 'end' : 'start';
                })
                .text(function(d) {
                    // Text for origin node.
                    if (d.name == 'origin') {
                        return d.title;
                    }
                    // Text for summary nodes.
                    if (d.repeated) {
                        return '[Recurring] ' + d.name;
                    }
                    return d.name;
                })
                .style('fill-opacity', 1e-6)
                .style({
                    'fill': function(d) {
                        if (d.name == 'origin') {
                            return nodeColor;
                        }
                    }
                })
                .attr('transform', function(d) {
                    if (d.name != 'origin') {
                        //return 'rotate(-20)';
                        return 'rotate(0)';
                    }
                });

            // Transition nodes to their new position.
            var nodeUpdate = node.transition()
                .duration(duration)
                .attr('transform', function(d) {
                    return 'translate(' + d.y + ',' + d.x + ')';
                });
            nodeUpdate.select('circle')
                .attr('r', 6)
                .style('fill', function(d) {
                    if (d._children || d.children) {
                        return nodeColor;
                    }
                })
                .style('fill-opacity', function(d) {
                    if (d.children) {
                        return 0.35;
                    }
                })
                // Setting summary node style as class as mass style setting is
                // not compatible to circles.
                .style('stroke-width', function(d) {
                    if (d.repeated) {
                        return 5;
                    }
                });

            nodeUpdate.select('text').style('fill-opacity', 1);

            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
                .duration(duration)
                .attr('transform', function(d) {
                    return 'translate(' + source.y + ',' + source.x + ')';
                })
                .remove();
            nodeExit.select('circle')
                .attr('r', 1e-6);
            nodeExit.select('text')
                .style('fill-opacity', 1e-6);

            // Update the links.
            var link = g.selectAll('path.' + link_class)
                .data(links, function(d) {
                    return d.target.id;
                });

            // Enter any new links at the parent's previous position.
            link.enter().insert('path', 'g')
                .attr('class', link_class)
                .attr('d', function(d) {
                    var o = {
                        x: source.x0,
                        y: source.y0
                    };
                    return diagonal({
                        source: o,
                        target: o
                    });
                });
            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr('d', diagonal);
            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr('d', function(d) {
                    var o = {
                        x: source.x,
                        y: source.y
                    };
                    return diagonal({
                        source: o,
                        target: o
                    });
                })
                .remove();
            // Stash the old positions for transition.
            nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });

            /**
             * Tree function to toggle on click.
             * @param {Object} d data object for D3 use.
             */
            function click(d) {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                    // expand all if it's the first node
                    if (d.name == 'origin') {
                        d.children.forEach(expand);
                    }
                }
                update(d, originalData, g, maxLength);
            }
        }
        // Collapse and Expand can be modified to include touched nodes.
        /**
         * Tree function to expand all nodes.
         * @param {Object} d data object for D3 use.
         */
        function expand(d) {
            if (d._children) {
                d.children = d._children;
                d.children.forEach(expand);
                d._children = null;
            }
        }

        /**
         * Tree function to collapse children nodes.
         * @param {Object} d data object for D3 use.
         */
        function collapse(d) {
            if (d.children && d.children.length != 0) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }

        /**
         * Tree function to redraw and zoom.
         */
        function redraw() {
            if(!this.initDrag && false) {
                this.initDrag = true;
                treeG.attr('transform', 'translate(' + (config.centralWidth * 2 + d3.event.translate[0]) + "," + (d3.event.translate[1]- 100) + ')' +
                    ' scale(' + d3.event.scale + ')');
            } else {
                treeG.attr('transform', 'translate(' + d3.event.translate + ')' +
                    ' scale(' + d3.event.scale + ')');
            }

        }

        /**
         * Tree sort function to sort and arrange nodes.
         * @param {Object} a First element to compare.
         * @param {Object} b Second element to compare.
         * @return {Boolean} boolean indicating the predicate outcome.
         */
        function sortByDate(a, b) {
            // Compare the individuals based on participation date
            //(no need to compare when there is only 1 summary)
            var aNum = a.name.substr(a.name.lastIndexOf('(') + 1, 4);
            var bNum = b.name.substr(b.name.lastIndexOf('(') + 1, 4);
            // Sort by date, name, id.
            return d3.ascending(aNum, bNum) ||
                d3.ascending(a.name, b.name) ||
                d3.ascending(a.id, b.id);
        }
    };



    if (!cwApi.customLibs) {
        cwApi.customLibs = {};
    }
    if (!cwApi.customLibs.cwD3Tree) {
        cwApi.customLibs.cwD3Tree = treeD3JS;
    };

}(cwAPI, jQuery));