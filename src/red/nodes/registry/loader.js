const when = require("when");
const fs = require("fs");
const path = require("path");
const semver = require("semver");
const _ = require("lodash");

const events = require("../../events");

const localfilesystem = require("./localfilesystem");
const registry = require("./registry");

var RED;
var settings;

const i18n = require("../../i18n");

const extras = require("extras");

const requiredNodes = [
  require("../nodeDefs/core/function"),
  require("../nodeDefs/core/inject"),
  require("../nodeDefs/core/remote"),
  require("../nodeDefs/core/delay"),
  require("../nodeDefs/core/debug"),
  require("../nodeDefs/core/template"),
  require("../nodeDefs/core/notify"),
  require("../nodeDefs/core/espeak"),
  require("../nodeDefs/analysis/sentiment"),
  require("../nodeDefs/logic/switch"),
  require("../nodeDefs/logic/change"),
  // require("../nodeDefs/logic/range"),
  require("../nodeDefs/core/comment"),
  require("../nodeDefs/io/httpin"),
  require("../nodeDefs/io/camera"),
  require("../nodeDefs/io/socketio"),
  require("../nodeDefs/io/meshblu"),
  require("../nodeDefs/io/mqtt"),
  require("../nodeDefs/io/gpio"),
  require("../nodeDefs/io/eventsource"),
  require("../nodeDefs/parsers/JSON"),
  require("../nodeDefs/storage/localdb"),
  require("../nodeDefs/io/geolocate"),
  require('../nodeDefs/io/vibrate'),
  require("../nodeDefs/io/gamepad"),
  require("../nodeDefs/io/voicerec"),
  require('../nodeDefs/io/accelerometer'),
  require('../nodeDefs/storage/file')
];


events.on("node-locales-dir", function (info) {
    i18n.registerMessageCatalog(info.namespace, info.dir, info.file);
});

function init(_settings) {
    settings = _settings;
    localfilesystem.init(settings);
    RED = require('../../pn');
}

function load(defaultNodesDir, disableNodePathScan) {
    // To skip node scan, the following line will use the stored node list.
    // We should expose that as an option at some point, although the
    // performance gains are minimal.
    //return loadNodeFiles(registry.getModuleList());

    for(var i in requiredNodes){
        requiredNodes[i](RED);
    }

    extras.loadBackend(RED);

    console.log('Loaded Nodes', RED.nodes.registry.nodeConstructors);

    // var nodeFiles = localfilesystem.getNodeFiles(defaultNodesDir, disableNodePathScan);
    var nodeGroups = {};
    var nodeFiles = {
        "node-red": {
            name: "node-red",
            version: "1.0.0",
            nodes: nodeGroups
        }
    };

    _.forEach(RED.nodes.registry.nodeConstructors, function(type, i){
        var groupName = type.groupName || i;
        nodeGroups[groupName] = nodeGroups[groupName] || {name: groupName, module: "node-red", types: [], file: groupName + '.js'};
        nodeGroups[groupName].types.push(i);
    });
    return loadNodeFiles(nodeFiles);
}

function loadNodeFiles(nodeFiles) {
    var promises = [];
    for (var module in nodeFiles) {
        /* istanbul ignore else */
        if (nodeFiles.hasOwnProperty(module)) {
            if (nodeFiles[module].redVersion && !semver.satisfies(RED.version().replace("-git", ""), nodeFiles[module].redVersion)) {
                //TODO: log it
                continue;
            }
            if (module == "node-red" || !registry.getModuleInfo(module)) {
                var first = true;
                for (var node in nodeFiles[module].nodes) {
                    /* istanbul ignore else */
                    if (nodeFiles[module].nodes.hasOwnProperty(node)) {

                        try {
                            promises.push(loadNodeConfig(nodeFiles[module].nodes[node]));
                        } catch (err) {
                            //
                        }
                    }
                }
            }
        }
    }
    return when.settle(promises).then(function (results) {
        var nodes = results.map(function (r) {
            registry.addNodeSet(r.value.id, r.value, r.value.version);
            return r.value;
        });
        return loadNodeSetList(nodes);
    });
}

function loadNodeConfig(fileInfo) {
    return when.promise(function (resolve) {
        var file = fileInfo.file;
        var module = fileInfo.module;
        var name = fileInfo.name;
        var version = fileInfo.version;

        var id = module + "/" + name;
        var info = registry.getNodeInfo(id);
        var isEnabled = true;
        if (info) {
            if (info.hasOwnProperty("loaded")) {
                throw new Error(file + " already loaded");
            }
            isEnabled = info.enabled;
        }

        var node = {
            id: id,
            module: module,
            name: name,
            file: file,
            template: file.replace(/\.js$/, ".html"),
            enabled: isEnabled,
            loaded: false,
            version: version
        };
        if (fileInfo.hasOwnProperty("types")) {
            node.types = fileInfo.types;
        }

        // fs.readFile(node.template, 'utf8', function (err, content) {
            // if (err) {
            //     node.types = [];
            //     if (err.code === 'ENOENT') {
            //         if (!node.types) {
            //             node.types = [];
            //         }
            //         node.err = "Error: " + file + " does not exist";
            //     } else {
            //         node.types = [];
            //         node.err = err.toString();
            //     }
            //     resolve(node);
            // } else {

                // var content = nodeContents[node.template];

                // var types = [];

                // var regExp = /<script ([^>]*)data-template-name=['"]([^'"]*)['"]/gi;
                // var match = null;

                // while ((match = regExp.exec(content)) !== null) {
                //     types.push(match[2]);
                // }
                // node.types = types;

                // var langRegExp = /^<script[^>]* data-lang=['"](.+?)['"]/i;
                // regExp = /(<script[^>]* data-help-name=[\s\S]*?<\/script>)/gi;
                // match = null;
                // var mainContent = "";
                // var helpContent = {};
                // var index = 0;
                // while ((match = regExp.exec(content)) !== null) {
                //     mainContent += content.substring(index, regExp.lastIndex - match[1].length);
                //     index = regExp.lastIndex;
                //     var help = content.substring(regExp.lastIndex - match[1].length, regExp.lastIndex);

                //     var lang = "en-US";
                //     if ((match = langRegExp.exec(help)) !== null) {
                //         lang = match[1];
                //     }
                //     if (!helpContent.hasOwnProperty(lang)) {
                //         helpContent[lang] = "";
                //     }

                //     helpContent[lang] += help;
                // }
                // mainContent += content.substring(index);

                //node.config = mainContent;
                //node.help = helpContent;
                node.help = {"en-US": ""};
                // TODO: parse out the javascript portion of the template
                //node.script = "";
                // for (var i = 0; i < node.types.length; i++) {
                //     if (registry.getTypeId(node.types[i])) {
                //         node.err = node.types[i] + " already registered";
                //         break;
                //     }
                // }
                // fs.stat(path.join(path.dirname(file), "locales"), function (err, stat) {
                //     if (!err) {
                //         node.namespace = node.id;
                //         i18n.registerMessageCatalog(node.id, path.join(path.dirname(file), "locales"), path.basename(file, ".js") + ".json").then(function () {
                //             resolve(node);
                //         });
                //     } else {
                        node.namespace = node.module;
                        resolve(node);
                //     }
                // });
           // }
        // });
    });
}

//function getAPIForNode(node) {
//    var red = {
//        nodes: RED.nodes,
//        library: RED.library,
//        credentials: RED.credentials,
//        events: RED.events,
//        log: RED.log,
//
//    }
//
//}

/**
 * Loads the specified node into the runtime
 * @param node a node info object - see loadNodeConfig
 * @return a promise that resolves to an update node info object. The object
 *         has the following properties added:
 *            err: any error encountered whilst loading the node
 *
 */
function loadNodeSet(node) {
    var nodeDir = path.dirname(node.file);
    var nodeFn = path.basename(node.file);
    if (!node.enabled) {
        return when.resolve(node);
    } else {}
    try {
        var loadPromise = null;
        var r = requiredNodes[node.file]; //require(node.file);
        if (typeof r === "function") {

            var red = {};
            for (var i in RED) {
                if (RED.hasOwnProperty(i) && !/^(init|start|stop)$/.test(i)) {
                    var propDescriptor = Object.getOwnPropertyDescriptor(RED, i);
                    Object.defineProperty(red, i, propDescriptor);
                }
            }
            red["_"] = function () {
                var args = Array.prototype.slice.call(arguments, 0);
                args[0] = node.namespace + ":" + args[0];
                return i18n._.apply(null, args);
            };
            var promise = null; //r(red);
            if (promise != null && typeof promise.then === "function") {
                loadPromise = promise.then(function () {
                    node.enabled = true;
                    node.loaded = true;
                    return node;
                }).catch(function (err) {
                    node.err = err;
                    return node;
                });
            }
        }
        if (loadPromise == null) {
            node.enabled = true;
            node.loaded = true;
            loadPromise = when.resolve(node);
        }
        return loadPromise;
    } catch (err) {
        node.err = err;
        return when.resolve(node);
    }
}

function loadNodeSetList(nodes) {
    var promises = [];
    nodes.forEach(function (node) {
        if (!node.err) {
            promises.push(loadNodeSet(node));
        } else {
            promises.push(node);
        }
    });

    return when.settle(promises).then(function () {
        if (settings.available()) {
            return registry.saveNodeList();
        } else {
            return;
        }
    });
}

function addModule(module) {
    if (!settings.available()) {
        throw new Error("Settings unavailable");
    }
    var nodes = [];
    if (registry.getModuleInfo(module)) {
        // TODO: nls
        var e = new Error("module_already_loaded");
        e.code = "module_already_loaded";
        return when.reject(e);
    }
    try {
        var moduleFiles = localfilesystem.getModuleFiles(module);
        return loadNodeFiles(moduleFiles);
    } catch (err) {
        return when.reject(err);
    }
}

function addFile(file) {
    if (!settings.available()) {
        throw new Error("Settings unavailable");
    }
    var info = registry.getNodeInfo("node-red/" + path.basename(file).replace(/^\d+-/, "").replace(/\.js$/, ""));
    if (info) {
        var err = new Error("File already loaded");
        err.code = "file_already_loaded";
        return when.reject(err);
    }
    var nodeFiles = localfilesystem.getLocalFile(file);
    if (nodeFiles) {
        var fileObj = {};
        fileObj[nodeFiles.module] = {
            name: nodeFiles.module,
            version: nodeFiles.version,
            nodes: {}
        };
        fileObj[nodeFiles.module].nodes[nodeFiles.name] = nodeFiles;

        return loadNodeFiles(fileObj);
    } else {
        var e = new Error();
        e.code = 404;
        return when.reject(e);
    }
}

function loadNodeHelp(node, lang) {
    var dir = path.dirname(node.template);
    var base = path.basename(node.template);
    var localePath = path.join(dir, "locales", lang, base);
    try {
        // TODO: make this async
        var content = fs.readFileSync(localePath, "utf8");
        return content;
    } catch (err) {
        return null;
    }
}

function getNodeHelp(node, lang) {
    if (!node.help[lang]) {
        var help = loadNodeHelp(node, lang);
        if (help == null) {
            var langParts = lang.split("-");
            if (langParts.length == 2) {
                help = loadNodeHelp(node, langParts[0]);
            }
        }
        if (help) {
            node.help[lang] = help;
        } else {
            node.help[lang] = node.help["en-US"];
        }
    }
    return node.help[lang];
}

module.exports = {
    init: init,
    load: load,
    addModule: addModule,
    addFile: addFile,
    loadNodeSet: loadNodeSet,
    getNodeHelp: getNodeHelp
};
