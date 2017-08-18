function Edge(u, v, w) {
    this.source = u;
    this.sink = v;
    this.capacity = w;
    this.redge = null; // reference to reverse edge
}

Edge.prototype.toString = function() {
    return this.source + "->" + this.sink + ":" + this.capacity;
};

function Path() {
    this.path = [];
}

Path.prototype.add_edge = function(edge, residual) {
    this.path.push([edge, residual]);
};

Path.prototype.in_path = function(edge, residual) {
    return 0 < $.grep(this.path, function (a) { return JSON.stringify([a[0].toString(), a[1]])==JSON.stringify([edge.toString(), residual]); }).length;
};

Path.prototype.get_min_flow = function() {
    var residuals = $.map(this.path, function (a) { return a[1]; });
    return Math.min.apply(null, residuals);
};

Path.prototype.length = function() {
    return this.path.length;
};

Path.prototype.get_edge = function(index) {
    return this.path[index][0];
};

Path.prototype.get_residual = function(index) {
    return this.path[index][1];
};

Path.prototype.copy = function() {
    new_path = new Path();
    for(var i = 0; i < this.length(); i++) {
        new_path.add_edge(this.get_edge(i), this.get_residual(i));
    }
    return new_path;
};

function FlowNetwork(graph)
{
    this.out_edges = {};
    this.in_edges = {};
    this.flow = {};

    if(typeof graph !== 'undefined') {
        for(var i = 0; i < graph.vertices.length; i++) {
            this.add_vertex(graph.vertices[i]);
        }
        for(i = 0; i < graph.vertices.length; i++) {
            for(var j = 0; j < graph.edges[graph.vertices[i]].length; j++) {
                this.add_edge(graph.vertices[i], graph.edges[graph.vertices[i]][j]);
            }
        }
    }
}

FlowNetwork.prototype.add_vertex = function(vertex) {
    this.out_edges[vertex] = [];
    this.in_edges[vertex] = [];
};

FlowNetwork.prototype.remove_vertex = function(vertex) {

    while(this.out_edges[vertex].length > 0) {
        var sink = this.out_edges[vertex][0].sink;
        this.remove_edge(vertex, sink);
        this.remove_edge(sink, vertex);
    }
    while(this.in_edges[vertex].length > 0) {
        var source = this.in_edges[vertex][0].source;
        this.remove_edge(source, vertex);
        this.remove_edge(vertex, source);
    }
    delete this.out_edges[vertex];
    delete this.in_edges[vertex];
};

FlowNetwork.prototype.get_edges = function(v) {
    return this.out_edges[v];
};

FlowNetwork.prototype.get_in_edges = function(v) {
    return this.in_edges[v];
};

FlowNetwork.prototype.add_edge = function(u, v, w) {
    if(u !== v) {
        var edge = new Edge(u, v, w);
        var redge = new Edge(v, u, 0);
        edge.redge = redge;
        redge.redge = edge;
        this.out_edges[u].push(edge);
        this.out_edges[v].push(redge);
        this.in_edges[u].push(redge);
        this.in_edges[v].push(edge);
        this.flow[edge] = 0;
        this.flow[redge] = 0;
    }
};

FlowNetwork.prototype.remove_edge = function(u, v) {
    var edge;
    var new_edge_list;
    // remove forward edge
    new_edge_list = [];
    for(var i = 0; i < this.out_edges[u].length; i++) {
        edge = this.out_edges[u][i];
        if(v == edge.sink && edge.capacity > 0) {
            delete this.flow[edge];
        } else {
            new_edge_list.push(edge);
        }
    }
    this.out_edges[u] = new_edge_list;
    new_edge_list = [];
    for(i = 0; i < this.in_edges[v].length; i++) {
        edge = this.in_edges[v][i];
        if(u == edge.source && edge.capacity > 0) {
            delete this.flow[edge];
        } else {
            new_edge_list.push(edge);
        }
    }
    this.in_edges[v] = new_edge_list;
    // remove counter-flow edge
    new_edge_list = [];
    for(i = 0; i < this.in_edges[u].length; i++) {
        edge = this.in_edges[u][i];
        if(v == edge.source && edge.capacity == 0) {
            delete this.flow[edge];
        } else {
            new_edge_list.push(edge);
        }
    }
    this.in_edges[u] = new_edge_list;
    new_edge_list = [];
    for(i = 0; i < this.out_edges[v].length; i++) {
        edge = this.out_edges[v][i];
        if(u == edge.sink && edge.capacity == 0) {
            delete this.flow[edge];
        } else {
            new_edge_list.push(edge);
        }
    }
    this.out_edges[v] = new_edge_list;
};

FlowNetwork.prototype.has_edge = function(u, v) {
    for(var i = 0; i < this.out_edges[u].length; i++) {
        if(v == this.out_edges[u][i].sink) {
            return true;
        }
    }
    return false;
};

FlowNetwork.prototype.find_path = function(source, sink, path, visited) {
    if(source === sink) {
        return path;
    }
    var source_edges = this.get_edges(source);
    for(var i = 0; i < source_edges.length; i++) {
        var edge = source_edges[i];
        var residual = edge.capacity - this.flow[edge];
        if(residual > 0 && !(edge.toString() in visited) && !path.in_path(edge, residual)) {
            visited[edge] = true;
            new_path = path.copy();
            new_path.add_edge(edge, residual);
            var result = this.find_path(edge.sink, sink, new_path, visited);
            if(result) {
                return result;
            }
        }
    }
};

FlowNetwork.prototype.reset_flows = function() {
    var edges = Object.keys(this.flow);
    for(var i = 0; i < edges.length; i++) {
        this.flow[edges[i]] = 0;
    }
};

FlowNetwork.prototype.max_flow = function(source, sink) {
    this.reset_flows();
    var path = this.find_path(source, sink, new Path(), {});
    while(path) {
        var flow = path.get_min_flow();
        for(var i = 0; i < path.length(); i++) {
            this.flow[path.get_edge(i)] += flow;
            this.flow[path.get_edge(i).redge] -= flow;
        }
        path = this.find_path(source, sink, new Path(), {});
    }
    var max_flow = 0;
    var edges = this.get_edges(source);
    for(i = 0; i < edges.length; i++) {
        max_flow += this.flow[edges[i]];
    }
    return max_flow;
};

//return an array of edge objects corresponding to a min cut
FlowNetwork.prototype.min_cut = function(source, sink) {
    // do Ford-Fulkerson to get residual flow network
    this.max_flow(source, sink);
    // DFS to find saturated edges reachable from sink
    this.visited = {};
    var saturated = [];
    this.find_saturated_edges(sink, saturated);
    // remove saturated edges whose source have been visited, leaving only min-cut edges
    var min_cut = [];
    for(var i = 0; i < saturated.length; i++) {
        if(!(saturated[i].source in this.visited)) {
            min_cut.push(saturated[i]);
        }
    }
    return min_cut;
};

FlowNetwork.prototype.find_saturated_edges = function(vertex, min_cut) {
    if(!(vertex in this.visited)) {
        var edges = this.get_in_edges(vertex);
        this.visited[vertex] = true;
        for(var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            var residual = edge.capacity - this.flow[edge];
            if(residual > 0) {
                this.find_saturated_edges(edge.source, min_cut);
            } else {
                if(edge.capacity > 0) {
                    min_cut.push(edge);
                }
            }
        }
    }
};

function UndirectedGraph(graph) {
    this.flow_network = new FlowNetwork();
    this.transformed_flow_network = new FlowNetwork();
    this.vertices = {};
    this.edges = {};

    if(typeof graph !== 'undefined') {
        for(var i = 0; i < graph.vertices.length; i++) {
            this.add_vertex(graph.vertices[i]);
        }
        for(i = 0; i < graph.vertices.length; i++) {
            for(var j = 0; j < graph.edges[graph.vertices[i]].length; j++) {
                this.add_edge(graph.vertices[i], graph.edges[graph.vertices[i]][j]);
            }
        }
    }
}

UndirectedGraph.prototype.vertex_label = function(v) {
    if(typeof v === "number") {
        var v_int = parseInt(v);
        return 'v' + v_int;
    } else {
        return v;
    }
};

UndirectedGraph.prototype.vertex_idx = function(v) {
    if(typeof v === "number") {
        return v;
    } else {
        return parseInt(v.substring(1));
    }
};

UndirectedGraph.prototype.add_vertex = function(v) {
    v = this.vertex_label(v);
    this.vertices[v] = true;
    this.flow_network.add_vertex(v);
    this.transformed_flow_network.add_vertex(v + '_out');
    this.transformed_flow_network.add_vertex(v + '_in');
    this.transformed_flow_network.add_edge(v + '_in', v + '_out', 1);
};

UndirectedGraph.prototype.remove_vertex = function(v) {
    v = this.vertex_label(v);
    delete this.vertices[v];
    this.flow_network.remove_vertex(v);
    this.transformed_flow_network.remove_vertex(v + '_out');
    this.transformed_flow_network.remove_vertex(v + '_in');
};

UndirectedGraph.prototype.add_edge = function(u, v) {
    v = this.vertex_label(v);
    u = this.vertex_label(u);
    if(u in this.vertices && v in this.vertices) {
        if(!(u in this.edges) && !(v in this.edges)) {
            this.edges[u] = {};
        }
        if((u in this.edges && !(v in this.edges[u])) || (v in this.edges && !(u in this.edges[v]))) {
            if(u in this.edges) {
                this.edges[u][v] = true;
            } else {
                this.edges[v][u] = true;
            }
            this.flow_network.add_edge(u, v, 1);
            this.flow_network.add_edge(v, u, 1);
            this.transformed_flow_network.add_edge(u + '_out', v + '_in', Infinity);
            this.transformed_flow_network.add_edge(v + '_out', u + '_in', Infinity);
        } else {
            console.warn('Edge already exists');
        }
    } else {
        console.warn('Tried adding edge with non-existent vertex.');
    }
};

UndirectedGraph.prototype.remove_edge = function(u, v) {
    v = this.vertex_label(v);
    u = this.vertex_label(u);
    if(this.adjacent(u, v)) {
        this.flow_network.remove_edge(u, v);
        this.flow_network.remove_edge(v, u);
        this.transformed_flow_network.remove_edge(u + '_out', v + '_in');
        this.transformed_flow_network.remove_edge(v + '_out', u + '_in');
    }
}

UndirectedGraph.prototype.adjacent = function(u, v) {
    v = this.vertex_label(v);
    u = this.vertex_label(u);
    return this.flow_network.has_edge(u, v);
};

UndirectedGraph.prototype.min_cut = function(source, sink) {
    source = this.vertex_label(source);
    sink = this.vertex_label(sink);
    var min_cut = this.flow_network.min_cut(source, sink);
    for(var i = 0; i < min_cut.length; i++) {
        min_cut[i] = [this.vertex_idx(min_cut[i].source), this.vertex_idx(min_cut[i].sink)];
    }
    return min_cut;
};

UndirectedGraph.prototype.min_vertex_cut = function(source, sink) {
    source = this.vertex_label(source);
    sink = this.vertex_label(sink);
    if(this.adjacent(source, sink)) {
        return [];
    } else {
        var edges = this.transformed_flow_network.min_cut(source + '_out', sink + '_in');
        var min_vertex_cut = [];
        for(var i = 0; i < edges.length; i++) {
            min_vertex_cut.push(edges[i].source.replace(/_in$/, ''));
        }
        for(var i = 0; i < min_vertex_cut.length; i++) {
            min_vertex_cut[i] = this.vertex_idx(min_vertex_cut[i]);
        }
        return min_vertex_cut;
    }
};

UndirectedGraph.prototype.clone = function() {
    var vertices = Object.keys(this.vertices);
    var new_graph = new UndirectedGraph();

    for(var i = 0; i < vertices.length; i++) {
        new_graph.add_vertex(vertices[i]);
    }
    var u_keys = Object.keys(this.edges);
    for(i = 0; i < u_keys.length; i++) {
        var v_keys = Object.keys(this.edges[u_keys[i]]);
        for(var j = 0; j < v_keys.length; j++) {
            new_graph.add_edge(u_keys[i], v_keys[j]);
        }
    }
    return new_graph;
};

function PathSelector(g, base_model_index, start_model, end_model) {
    $('#undo').show();
    $('#reset').show();

    this.initial_graph = g;
    this.base_model_index = base_model_index;
    this.start_model = start_model;
    this.end_model = end_model;
    this.choice_history = [];
    this.init();
    this.select();
}

PathSelector.prototype.init = function() {
    var u = this.base_model_index[this.start_model];
    var v = this.base_model_index[this.end_model];

    if(u == v) {
        this.done = true;
        this.chosen_nodes = [u];
    } else {
        this.graph = this.initial_graph.clone();
        this.u = u;
        this.v = v;

        this.excluded_nodes = [];
        this.chosen_nodes = [u, v];
        this.source = u;
        this.sink = v;
        this.update_cut_set();
    }
};

PathSelector.prototype.undo = function() {
    // re-initialize and then replay choices up to the previous
    this.init();
    this.choice_history.pop();
    for(var i = 0; i < this.choice_history.length; i++) {
        this.choose(this.choice_history[i]);
    }
    this.select();
};

PathSelector.prototype.reset = function() {
    this.choice_history = [];
    this.init();
    this.select();
};

PathSelector.prototype.is_done = function() {
    return this.done;
};

PathSelector.prototype.choose = function(choice) {
    if(this.cut_set.indexOf(choice) != -1) {
        // remove vertices other than the chosen one so we don't find paths going back through them
        while(this.cut_set.length > 0) {
            var v = this.cut_set.pop();
            if(v != choice) {
                this.graph.remove_vertex(v);
                this.excluded_nodes.push(v);
            }
        }

        // insert the chosen node between the source and sink
        var new_chosen_nodes = [];
        for(var i = 0; i < this.chosen_nodes.length; i++) {
            new_chosen_nodes.push(this.chosen_nodes[i]);
            if(this.chosen_nodes[i] == this.source) {
                new_chosen_nodes.push(choice);
            }
        }
        this.chosen_nodes = new_chosen_nodes;

        this.update_cut_set();
    } else {
        console.warn('Tried to choose a vertex not in cut set.');
    }
};

PathSelector.prototype.update_cut_set = function() {
    this.done = true;
    for(var i = 0; i < this.chosen_nodes.length - 1; i++) {
        if(!this.graph.adjacent(this.chosen_nodes[i], this.chosen_nodes[i+1])) {
            this.done = false;
            this.source = this.chosen_nodes[i];
            this.sink = this.chosen_nodes[i+1];
            this.cut_set = this.graph.min_vertex_cut(this.source, this.sink);
            if(this.cut_set.length == 1) {
                this.choose(this.cut_set[0]);
            }
        }
    }
};

PathSelector.prototype.get_choices = function() {
    return this.cut_set;
};

PathSelector.prototype.get_path = function() {
    if(this.done) {
        return this.chosen_nodes;
    } else {
        // return e.g. ['node1','node2',[],'node3',[],['node4','node5'],'node6']
        // indicating that nodes 1 and 6 are the original endpoints, node 3 has been
        // selected but is not directly adjacent to node2, and is not adjacent to at
        // least one of nodes 4 & 5.  nodes 4 and 5 form the current cut-set between
        // nodes 3 & 6, from which the next choice should be made.  an empty slot is
        // not left between ['node4','node5'] and 'node6' because both nodes 4 & 5 are
        // adjacent to node 6.
        var path;
        if(this.u !== this.start_model) {
            path = [this.start_model + ' (' + this.u + ')'];
        } else {
            path = [this.u];
        }
        for(var i = 0; i < this.chosen_nodes.length - 1; i++) {
            var prev_node = this.chosen_nodes[i];
            var node = this.chosen_nodes[i+1];
            if(prev_node == this.source) {
                var left_adjacent = true;
                var right_adjacent = true;
                for(var j = 0; j < this.cut_set.length; j++) {
                    left_adjacent = left_adjacent && this.graph.adjacent(prev_node, this.cut_set[j]);
                    right_adjacent = right_adjacent && this.graph.adjacent(this.cut_set[j], node);
                }
                if(!left_adjacent) {
                    path.push([]);
                }
                path.push(this.cut_set);
                if(!right_adjacent) {
                    path.push([]);
                }
            } else {
                if(!this.graph.adjacent(prev_node, node)) {
                    path.push([]);
                }
            }
            if(i == this.chosen_nodes.length - 2) {
                if(this.v !== this.end_model) {
                    path.push(this.end_model + ' (' + this.v + ')');
                } else {
                    path.push(this.v);
                }
            } else {
                path.push(node);
            }
        }
        return path;
    }
};

PathSelector.prototype.select = function(event) {
    if(event) {
        var choice = event.data;

        // add choice to history to support undo functionality
        this.choice_history.push(choice);
        this.choose(choice);
    }

    var models_to_graph = [];
    var left_path = $('#left_path');
    var path_choice = $('#path_choice');
    var right_path = $('#right_path');
    left_path.html('');
    path_choice.html('');
    right_path.html('');

    if(this.is_done()) {
        models_to_graph = this.get_path();
        left_path.html(models_to_graph.join(' &rarr; '));
    } else {
        var choices = this.get_choices();
        var path_so_far = this.get_path();
        var html;

        if(0 == choices.length) {
            left_path.showHtml('Can\'t find a path between ' + path_so_far[0] + ' and ' + path_so_far[path_so_far.length-1] + '.');
        } else {
            var path_elem = left_path;
            html = '';
            for(i = 0; i < path_so_far.length; i++) {
                if(path_so_far[i] instanceof Array) {
                    if(path_so_far[i].length == 0) {
                        html += ' <span class="arrows">&hellip; &rarr;</span> ';
                    } else {
                        path_elem.html(html);
                        html = '';

                        for(var j = 0; j < choices.length; j++) {
                            html += '<div class="path_select_choice" id="path_select_' + choices[j] + '">' + choices[j] + '</div><br />';
                        }
                        path_choice.html(html);
                        html = '';

                        path_elem = right_path;
                        html += ' <span class="arrows">&rarr;</span> ';
                    }
                } else {
                    html += path_so_far[i];
                    models_to_graph.push(path_so_far[i].split(' ')[0]);
                    if(i < path_so_far.length - 1) {
                        html += ' <span class="arrows">&rarr;</span> ';
                    }
                    path_elem.html(html);
                }
            }
        }
    }

    if(!this.is_done()) {
        for(i = 0; i < choices.length; i++) {
            $('#path_select_' + choices[i]).click(choices[i], function(event) { path_selector.select(event) });
        }
    }

    var $undo_button = $('#undo');
    var $reset_button = $('#reset');

    if(0 == this.choice_history.length) {
        $undo_button.attr('disabled', 'disabled');
        $reset_button.attr('disabled', 'disabled');
    } else {
        $undo_button.removeAttr('disabled');
        $reset_button.removeAttr('disabled');
    }

    $.get('get_graph?selected_models=' + models_to_graph.join(','), function(data) { $('#graph').html(data); });
};
