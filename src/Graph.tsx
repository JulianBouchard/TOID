import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import cytoscape from "cytoscape";
import popper from "cytoscape-popper";
const klay = require("cytoscape-klay");
cytoscape.use(klay);
cytoscape.use(popper);

export type DataType = {
  models: {
    id: number;
    newPlaces: string[];
    oldPlaces: string[];
    newTransitions: string[];
    oldTransitions: string[];
    links: {
      src: string;
      dest: string;
      weight: number;
      intensity: number;
    }[];
  }[];
  fadingIscLinks: string[][];
  currentIscLinks: string[][];
};

type GraphProps = {
  data: DataType | null;
  hideNames: boolean;
  colors: string[];
};

/**
 * @param {DataType} data - The data to be converted to a graph.
 * @param {boolean} hideNames - Whether to hide the names above the places. (Default: True)
 * @return Returns a canvas with a graph inside.
 */
const Graph: React.FC<GraphProps> = ({ data, hideNames, colors }) => {
  // if the data changes, construct the new graph
  React.useEffect(() => {
    if (!data) return;

    // initialize graph
    const cy = cytoscape({
      container: document.getElementById("cy"), // container to render in
      style: [
        // the stylesheet for the graph
        {
          selector: ".transition",
          style: {
            // "background-color": nodeColor,
            label: "data(id)",
          },
        },
        {
          selector: ".place",
          style: {
            // "background-color": nodeColor,
            label: hideNames ? "" : "data(id)",
          },
        },
        {
          selector: "edge",
          style: {
            width: 3,
            // "line-color": linkColor,
            // "target-arrow-color": linkColor,
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
    });

    for (let i = 0; i < data.models.length; i++) {
      // add transitions
      cy.add(
        data.models[i].oldTransitions.map((t) => {
          return {
            group: "nodes",
            classes: "transition",
            data: { id: t },
            style: {
              shape: "rectangle",
              width: "15rem",
              height: "30rem",
              "border-style": "solid",
              "border-width": "2rem",
              "border-color": colors[i],
              "border-opacity": 1,
            },
          };
        })
      );

      cy.add(
        data.models[i].newTransitions.map((t) => {
          return {
            group: "nodes",
            classes: "transition new",
            data: { id: t },
            style: {
              shape: "rectangle",
              width: "15rem",
              height: "30rem",
              opacity: 0.2,
              "border-style": "solid",
              "border-width": "2rem",
              "border-color": colors[i],
              "border-opacity": 1,
              "background-color": colors[i],
            },
          };
        })
      );

      // add places
      cy.add(
        data.models[i].oldPlaces.map((p) => {
          return {
            group: "nodes",
            classes: "place",
            data: { id: p },
            style: {
              shape: "ellipse",
              width: "28rem",
              height: "28rem",
              "border-style": "solid",
              "border-width": "2rem",
              "border-color": colors[i],
              "border-opacity": 1,
            },
          };
        })
      );

      cy.add(
        data.models[i].newPlaces.map((p) => {
          return {
            group: "nodes",
            classes: "place new",
            data: { id: p },
            style: {
              shape: "ellipse",
              width: "28rem",
              height: "28rem",
              opacity: 0.2,
              "border-style": "solid",
              "border-width": "2rem",
              "border-color": colors[i],
              "border-opacity": 1,
              "background-color": colors[i],
            },
          };
        })
      );

      // add links
      cy.add(
        data.models[i].links.map((p) => {
          const width = (p.weight - 0.5) * 2 * 4 + 1;
          return {
            group: "edges",
            classes: "non-isc",
            data: {
              id: p.src + p.dest,
              source: p.src,
              target: p.dest,
              weight: p.weight,
              intensity: p.intensity,
            },
            style: {
              "line-color": colors[i],
              "target-arrow-color": colors[i],
              width: "" + width + "rem",
              opacity: p.intensity,
            },
          };
        })
      );
    }

    // add klay layout
    cy.layout(options).run();

    // add fading isc links
    cy.add(
      data.fadingIscLinks.map((p) => {
        return {
          group: "edges",
          classes: "faded",
          data: { id: p.toString(), source: p[0], target: p[1] },
          style: {
            "line-color": "red",
            "target-arrow-color": "red",
            "line-style": "dashed",
          },
        };
      })
    );

    // add new isc links
    cy.add(
      data.currentIscLinks.map((p) => {
        return {
          group: "edges",
          data: { id: p.toString(), source: p[0], target: p[1] },
          style: {
            "line-color": "red",
            "target-arrow-color": "red",
            "line-style": "dashed",
          },
        };
      })
    );

    cy.elements(".faded").animate({
      style: { opacity: 0 },
      duration: 2000,
    });

    cy.elements(".new").animate({
      style: { opacity: 1 },
      duration: 2000,
      easing: "ease-in-sine",
    });

    cy.on("mouseover", ".non-isc", function (evt) {
      const node = evt.target;
      node.popper({
        content: () => {
          if (!document.getElementById("tooltip")) {
            const div = document.createElement("div");
            div.setAttribute("id", "tooltip");
            div.innerHTML = renderToStaticMarkup(
              <>
                <div>
                  <p>Intensity</p>
                  <p>{"" + +(node.data("intensity") * 100).toFixed(2) + "%"}</p>
                </div>
                <div>
                  <p>Weight</p>
                  <p>{"" + +(node.data("weight") * 100).toFixed(2) + "%"}</p>
                </div>
              </>
            );
            document.body.appendChild(div);
            return div;
          }
        },
        popper: {}, // my popper options here
      });
    });

    cy.on("mouseout", "edges", function () {
      const div = document.getElementById("tooltip");
      if (div) document.body.removeChild(div);
    });
  }, [data, hideNames]);

  return <div id="cy" style={{ width: "100%", height: "800px" }} />;
};

export default Graph;

// these are the layout options from https://github.com/cytoscape/cytoscape.js-klay
const options = {
  name: "klay",
  nodeDimensionsIncludeLabels: false, // Boolean which changes whether label dimensions are included when calculating node dimensions
  fit: true, // Whether to fit
  padding: 1, // Padding on fit
  animate: false, // Whether to transition the node positions
  animateFilter: function (node: any, i: any) {
    return true;
  }, // Whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
  animationDuration: 500, // Duration of animation in ms if enabled
  animationEasing: undefined, // Easing of animation if enabled
  transform: function (node: any, pos: any) {
    return pos;
  }, // A function that applies a transform to the final node position
  ready: undefined, // Callback on layoutready
  stop: undefined, // Callback on layoutstop
  klay: {
    // Following descriptions taken from http://layout.rtsys.informatik.uni-kiel.de:9444/Providedlayout.html?algorithm=de.cau.cs.kieler.klay.layered
    addUnnecessaryBendpoints: false, // Adds bend points even if an edge does not change direction.
    aspectRatio: 1.6, // The aimed aspect ratio of the drawing, that is the quotient of width by height
    borderSpacing: 1, // Minimal amount of space to be left to the border
    compactComponents: false, // Tries to further compact components (disconnected sub-graphs).
    crossingMinimization: "LAYER_SWEEP", // Strategy for crossing minimization.
    /* LAYER_SWEEP The layer sweep algorithm iterates multiple times over the layers, trying to find node orderings that minimize the number of crossings. The algorithm uses randomization to increase the odds of finding a good result. To improve its results, consider increasing the Thoroughness option, which influences the number of iterations done. The Randomization seed also influences results.
    INTERACTIVE Orders the nodes of each layer by comparing their positions before the layout algorithm was started. The idea is that the relative order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive layer sweep algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
    cycleBreaking: "GREEDY", // Strategy for cycle breaking. Cycle breaking looks for cycles in the graph and determines which edges to reverse to break the cycles. Reversed edges will end up pointing to the opposite direction of regular edges (that is, reversed edges will point left if edges usually point right).
    /* GREEDY This algorithm reverses edges greedily. The algorithm tries to avoid edges that have the Priority property set.
    INTERACTIVE The interactive algorithm tries to reverse edges that already pointed leftwards in the input graph. This requires node and port coordinates to have been set to sensible values.*/
    direction: "DOWN", // Overall direction of edges: horizontal (right / left) or vertical (down / up)
    /* UNDEFINED, RIGHT, LEFT, DOWN, UP */
    edgeRouting: "ORTHOGONAL", // Defines how edges are routed (POLYLINE, ORTHOGONAL, SPLINES)
    edgeSpacingFactor: 0.5, // Factor by which the object spacing is multiplied to arrive at the minimal spacing between edges.
    feedbackEdges: false, // Whether feedback edges should be highlighted by routing around the nodes.
    fixedAlignment: "LEFTUP", // Tells the BK node placer to use a certain alignment instead of taking the optimal result.  This option should usually be left alone.
    /* NONE Chooses the smallest layout from the four possible candidates.
    LEFTUP Chooses the left-up candidate from the four possible candidates.
    RIGHTUP Chooses the right-up candidate from the four possible candidates.
    LEFTDOWN Chooses the left-down candidate from the four possible candidates.
    RIGHTDOWN Chooses the right-down candidate from the four possible candidates.
    BALANCED Creates a balanced layout from the four possible candidates. */
    inLayerSpacingFactor: 1.0, // Factor by which the usual spacing is multiplied to determine the in-layer spacing between objects.
    layoutHierarchy: false, // Whether the selected layouter should consider the full hierarchy
    linearSegmentsDeflectionDampening: 0.3, // Dampens the movement of nodes to keep the diagram from getting too large.
    mergeEdges: false, // Edges that have no ports are merged so they touch the connected nodes at the same points.
    mergeHierarchyCrossingEdges: true, // If hierarchical layout is active, hierarchy-crossing edges use as few hierarchical ports as possible.
    nodeLayering: "NETWORK_SIMPLEX", // Strategy for node layering.
    /* NETWORK_SIMPLEX This algorithm tries to minimize the length of edges. This is the most computationally intensive algorithm. The number of iterations after which it aborts if it hasn't found a result yet can be set with the Maximal Iterations option.
    LONGEST_PATH A very simple algorithm that distributes nodes along their longest path to a sink node.
    INTERACTIVE Distributes the nodes into layers by comparing their positions before the layout algorithm was started. The idea is that the relative horizontal order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive node layering algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
    nodePlacement: "SIMPLE", // Strategy for Node Placement
    /* BRANDES_KOEPF Minimizes the number of edge bends at the expense of diagram size: diagrams drawn with this algorithm are usually higher than diagrams drawn with other algorithms.
    LINEAR_SEGMENTS Computes a balanced placement.
    INTERACTIVE Tries to keep the preset y coordinates of nodes from the original layout. For dummy nodes, a guess is made to infer their coordinates. Requires the other interactive phase implementations to have run as well.
    SIMPLE Minimizes the area at the expense of... well, pretty much everything else. */
    randomizationSeed: 1, // Seed used for pseudo-random number generators to control the layout algorithm; 0 means a new seed is generated
    routeSelfLoopInside: false, // Whether a self-loop is routed around or inside its node.
    separateConnectedComponents: true, // Whether each connected component should be processed separately
    spacing: 50, // Overall setting for the minimal amount of space to be left between objects
    thoroughness: 10, // How much effort should be spent to produce a nice layout..
  },
  priority: function (edge: any) {
    return null;
  }, // Edges with a non-nil value are skipped when greedy edge cycle breaking is enabled
};
