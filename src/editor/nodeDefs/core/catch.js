module.exports = function(RED){    
  RED.nodes.registerType('catch',{
    category: 'input',
    color:"#e49191",
    defaults: {
      name: {value:""},
      scope: {value:null}
    },
    inputs:0,
    outputs:1,
    icon: "alert.png",
    label: function() {
      return this.name||this.scope?this._("catch.catchNodes",{number:this.scope.length}):this._("catch.catch");
    },
    labelStyle: function() {
      return this.name?"node_label_italic":"";
    },
    oneditprepare: function() {
      var nodeList = $("#node-input-catch-target-container");
      var node = this;
      function createNodeList() {
        var scope = node.scope || [];
        nodeList.empty();

        var candidateNodes = RED.nodes.filterNodes({z:node.z});
        var allChecked = true;

        candidateNodes.forEach(function(n) {
          if (n.id === node.id) {
            return;
          }
          var isChecked = scope.indexOf(n.id) !== -1;

          allChecked = allChecked && isChecked;

          var container = $('<li/>',{class:"node-input-target-node"});
          var row = $('<label/>',{for:"node-input-target-node-"+n.id}).appendTo(container);
          $('<input>',{type:"checkbox",class:"node-input-target-node-checkbox",id:"node-input-target-node-"+n.id})
          .data('node-id',n.id)
          .prop('checked', isChecked)
          .appendTo(row);
          container.on('mouseover',function(e) {
            n.highlighted = true;
            n.dirty = true;
            RED.view.redraw();
          });
          container.on('mouseout',function(e) {
            n.highlighted = false;
            n.dirty = true;
            RED.view.redraw();
          });
          var labelSpan = $('<span>');
          var nodeDef = RED.nodes.getType(n.type);
          var label;
          var sublabel;
          if (nodeDef) {
            var l = nodeDef.label;
            label = (typeof l === "function" ? l.call(n) : l)||"";
            sublabel = n.type;
            if (sublabel.indexOf("subflow:") === 0) {
              var subflowId = sublabel.substring(8);
              var subflow = RED.nodes.subflow(subflowId);
              sublabel = "subflow : "+subflow.name;
            }
          }
          if (!nodeDef || !label) {
            label = n.type;
          }
          $('<span>',{class:"node-input-target-node-label",style:"white-space:nowrap"}).text(label).appendTo(row);
          if (sublabel) {
            $('<span>',{class:"node-input-target-node-sublabel"}).text(sublabel).appendTo(row);
          }

          container.appendTo(nodeList);
        });

        $(".node-input-target-node-checkbox").change(function() {
          if (!this.checked) {
            $("#node-input-target-node-checkbox-all").prop('checked',false);
          }
        });

        $("#node-input-target-node-checkbox-all").prop('checked',allChecked);

        sortNodeList('label');
      }

      function sortNodeList(sortOn) {
        var currentSort = nodeList.data('currentSort');
        var currentSortOrder = nodeList.data('currentSortOrder');

        if (!currentSort) {
          currentSort = sortOn;
          currentSortOrder = 'a';
        } else {
          if (currentSort === sortOn) {
            currentSortOrder = (currentSortOrder === 'a'?'d':'a');
          } else {
            currentSortOrder = 'a';
          }
          currentSort = sortOn;
        }
        nodeList.data('currentSort',currentSort);
        nodeList.data('currentSortOrder',currentSortOrder);

        $("#node-input-catch-target-container-div .fa").hide();
        $(".node-input-catch-sort-"+currentSort+"-"+currentSortOrder).show();


        var items = nodeList.find("li").get();
        items.sort(function(a,b) {
          var labelA = $(a).find(".node-input-target-node-"+currentSort).text().toLowerCase();
          var labelB = $(b).find(".node-input-target-node-"+currentSort).text().toLowerCase();
          if (labelA < labelB) { return currentSortOrder==='a'?-1:1; }
          if (labelA > labelB) { return currentSortOrder==='a'?1:-1; }
          return 0;
        });
        $.each(items, function(i, li){
          nodeList.append(li);
        });
      }
      $("#node-input-target-sort-label").click(function(e) {
        e.preventDefault();
        sortNodeList('label');
      });

      $("#node-input-target-sort-type").click(function(e) {
        e.preventDefault();
        sortNodeList('sublabel')
      });
      $("#node-input-target-node-checkbox-all").change(function() {
        $(".node-input-target-node-checkbox").prop('checked',this.checked);
      })



      $("#node-input-scope-select").change(function(e) {
        var scope = $(this).children("option:selected").val();
        if (scope === "target") {
          createNodeList();
          $(".node-input-target-row").show();
        } else {
          $(".node-input-target-row").hide();
        }
      });
      if (this.scope == null) {
        $("#node-input-scope-select").val("all");
      } else {
        $("#node-input-scope-select").val("target");
      }
      $("#node-input-scope-select").change();

      function dialogResize() {
        var rows = $("#dialog-form>div:not(.node-input-target-row)");
        var height = $("#dialog-form").height();
        for (var i=0;i<rows.size();i++) {
          height -= $(rows[i]).outerHeight(true);
        }
        var editorRow = $("#dialog-form>div.node-input-target-row");
        height -= (parseInt(editorRow.css("marginTop"))+parseInt(editorRow.css("marginBottom")));
        $("#node-input-catch-target-container-div").css("height",height+"px");
      };

      $( "#dialog" ).on("dialogresize", dialogResize);
      $( "#dialog" ).one("dialogopen", function(ev) {
        var size = $( "#dialog" ).dialog('option','sizeCache-catch');
        if (size) {
          $("#dialog").dialog('option','width',size.width);
          $("#dialog").dialog('option','height',size.height);
          dialogResize();
        }
      });
      $( "#dialog" ).one("dialogclose", function(ev,ui) {
        $( "#dialog" ).off("dialogresize",dialogResize);
      });

    },
    oneditsave: function() {
      var scope = $("#node-input-scope-select").children("option:selected").val();
      if (scope === 'all') {
        this.scope = null;
      } else {
        var node = this;
        node.scope = [];
        $(".node-input-target-node-checkbox").each(function(n) {
          if ($(this).prop("checked")) {
            node.scope.push($(this).data('node-id'));
          }
        })

      }
    },
    render: function () {
      return (
        <div>
        <style>
        {`
          #node-input-catch-target-container {
          position: relative;
          }
          #node-input-catch-target-container li {
          padding: 2px 5px;
          background: none;
          font-size: 0.8em;
          margin:0;
          white-space: nowrap;
          }
          #node-input-catch-target-container li label {
          margin-bottom: 0;
          width: 100%;
          }
          #node-input-catch-target-container li label input {
          vertical-align: top;
          width:15px;
          margin-right: 10px;
          }
          #node-input-catch-target-container li:hover,
          #node-input-catch-target-container li:hover .node-input-target-node-sublabel {
          background: #f0f0f0;
          }
          .node-input-target-node-sublabel {
          position:absolute;
          right: 0px;
          padding-right: 10px;
          padding-left: 10px;
          font-size: 0.8em;
          background: #fbfbfb;
          }
          `}
          </style>
          <div className="form-row">
          <label style={{ width: "auto" }} htmlFor="node-input-scope" data-i18n="catch.label.source"></label>
          <select id="node-input-scope-select">
          <option value="all" data-i18n="catch.scope.all"></option>
          <option value="target" data-i18n="catch.scope.selected"></option>
          </select>
          </div>
          <div className="form-row node-input-target-row" style={{ display: "none" }}>
          <div id="node-input-catch-target-container-div" style={{ position: "relative", boxSizing: "border-box", borderRadius: "2px", height: "180px", border: "1px solid #ccc", overflow: "hidden"}}>
          <div style={{ boxSizing: "border-box", lineHeight: "20px", fontSize: "0.8em", borderBottom: "1px solid #ddd", height: "20px" }}>
          <input type="checkbox" data-i18n="[title]catch.label.selectAll" id="node-input-target-node-checkbox-all" style={{ width: "30px", margin: "0 2px 1px 2px" }}/>
          <div style={{ display: "inline-block" }}><a id="node-input-target-sort-label" href="#" data-i18n="[title]catch.label.sortByLabel"><span data-i18n="catch.label.node"></span> <i className="node-input-catch-sort-label-a fa fa-caret-down"></i><i className="node-input-catch-sort-label-d fa fa-caret-up"></i></a></div>
          <div style={{ position: "absolute", right: "10px", width: "50px", display: "inline-block", textAlign: "right" }}><a id="node-input-target-sort-type" href="#" data-i18n="[title]catch.label.sortByType"><i className="node-input-catch-sort-sublabel-a fa fa-caret-down"></i><i className="node-input-catch-sort-sublabel-d fa fa-caret-up"></i> <span data-i18n="catch.label.type"></span></a></div>
          </div>
          <div style={{ background: "#fbfbfb", boxSizing: "border-box", position: "absolute", top: "20px", bottom: "0px", left: "0px", right: "0px", overflowY: "scroll", overflowX: "hidden"}}>
          <ul id="node-input-catch-target-container" style={{ listStyleType: "none", margin: "0" }}></ul>
          </div>
          </div>
          </div>
          <div className="form-row">
          <label htmlFor="node-input-name"><i className="fa fa-tag"></i> <span data-i18n="common.label.name"></span></label>
            <input type="text" id="node-input-name" data-i18n="[placeholder]common.label.name"/>
          </div>
          </div>
      )
    },
    renderHelp: function () {
      return (
        <div>
        <p>Catch errors thrown by nodes on the same tab.</p>
        <p>If a node throws a error whilst handling a message, the flow will typically
          halt. This node can be used to catch those errors and handle them with a
        dedicated flow.</p>
        <p>The node will catch errors thrown by any node on the same tab. If there
          are multiple catch nodes on a tab, they will all get triggered.</p>
        <p>If an error is thrown within a subflow, the error will get handled by any
          catch nodes within the subflow. If none exists, the error is propagated
            up to the tab the subflow instance is on.</p>
        <p>The message sent by this node will be the original message if the node that
          threw the error provided it. The message will have an <code>error</code>
        property with the following attributes:
          <ul>
          <li><code>message</code> : the error message</li>
          <li><code>source.id</code> : the id of the node that threw the error</li>
          <li><code>source.type</code> : the type of the node that threw the error</li>
          <li><code>source.name</code> : the name, if set, of the node that threw the error</li>
          </ul>
          </p>
          <p>If the message already had a <code>error</code> property, it is copied to <code>_error</code>.</p>

            </div>
      )
    },
    renderDescription: function () {
      return (
        <p>Catch errors thrown by nodes on the same tab.</p>
      )
    }
  });
}
