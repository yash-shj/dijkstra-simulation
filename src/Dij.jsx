import React, { useState, useEffect, useRef } from 'react';

const DijkstraVisualization = () => {
  const [graph, setGraph] = useState({});
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [startNode, setStartNode] = useState('');
  const [nodeInput, setNodeInput] = useState('');
  const [edgeInput, setEdgeInput] = useState('');
  const [sortingSteps, setSortingSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [currentNode, setCurrentNode] = useState(null);
  const [visitedNodes, setVisitedNodes] = useState([]);
  const [processingEdges, setProcessingEdges] = useState([]);
  const [distances, setDistances] = useState({});
  const [previousNodes, setPreviousNodes] = useState({});
  const [speed, setSpeed] = useState(500);
  const [isSorting, setIsSorting] = useState(false);
  const [explanation, setExplanation] = useState('Add nodes and edges, then start visualization');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef(null);

  // Generate random graph
  const generateRandomGraph = () => {
    const nodeCount = Math.floor(Math.random() * 3) + 5; // 5-7 nodes
    const newNodes = Array.from({ length: nodeCount }, (_, i) => String.fromCharCode(65 + i)); // A, B, C, ...
    const newEdges = [];
    const newGraph = {};

    // Initialize graph
    newNodes.forEach(node => {
      newGraph[node] = {};
    });

    // Generate random edges
    newNodes.forEach(node => {
      // Each node connects to 1-3 other nodes
      const connectionCount = Math.floor(Math.random() * 3) + 1;
      const possibleTargets = newNodes.filter(n => n !== node && !newGraph[node][n]);

      for (let i = 0; i < Math.min(connectionCount, possibleTargets.length); i++) {
        // Select random target node
        const targetIndex = Math.floor(Math.random() * possibleTargets.length);
        const target = possibleTargets[targetIndex];
        possibleTargets.splice(targetIndex, 1);

        // Add edge with random weight (1-10)
        const weight = Math.floor(Math.random() * 10) + 1;
        newGraph[node][target] = weight;
        newEdges.push({ from: node, to: target, weight });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setGraph(newGraph);
    setStartNode(newNodes[0]);

    const edgesText = newEdges.map(edge => `${edge.from}-${edge.to}:${edge.weight}`).join(', ');
    setNodeInput(newNodes.join(', '));
    setEdgeInput(edgesText);

    resetVisualization();
  };

  // Handle input changes
  const handleNodeInputChange = (e) => {
    setNodeInput(e.target.value);
  };

  const handleEdgeInputChange = (e) => {
    setEdgeInput(e.target.value);
  };

  const handleStartNodeChange = (e) => {
    setStartNode(e.target.value);
  };

  // Parse input to create graph
  const parseGraph = () => {
    try {
      // Parse nodes
      const parsedNodes = nodeInput.split(',').map(node => node.trim()).filter(node => node);
      if (parsedNodes.length === 0) {
        alert('Please enter at least one node');
        return false;
      }

      // Check for duplicate nodes
      if (new Set(parsedNodes).size !== parsedNodes.length) {
        alert('Duplicate nodes are not allowed');
        return false;
      }

      // Parse edges
      const parsedEdges = [];
      const newGraph = {};

      // Initialize graph
      parsedNodes.forEach(node => {
        newGraph[node] = {};
      });

      if (edgeInput.trim()) {
        const edgeParts = edgeInput.split(',').map(edge => edge.trim());

        for (const edge of edgeParts) {
          const match = edge.match(/([^-]+)-([^:]+):(\d+)/);
          if (!match) {
            alert(`Invalid edge format: ${edge}. Use format 'A-B:5'`);
            return false;
          }

          const [, from, to, weightStr] = match;
          const fromNode = from.trim();
          const toNode = to.trim();
          const weight = parseInt(weightStr);

          if (!parsedNodes.includes(fromNode) || !parsedNodes.includes(toNode)) {
            alert(`Edge ${fromNode}-${toNode} references unknown node`);
            return false;
          }

          if (isNaN(weight) || weight <= 0) {
            alert(`Invalid weight for edge ${fromNode}-${toNode}`);
            return false;
          }

          newGraph[fromNode][toNode] = weight;
          parsedEdges.push({ from: fromNode, to: toNode, weight });
        }
      }

      setNodes(parsedNodes);
      setEdges(parsedEdges);
      setGraph(newGraph);

      // Set default start node if not valid
      if (!parsedNodes.includes(startNode)) {
        setStartNode(parsedNodes[0]);
      }

      return true;
    } catch (error) {
      alert('Error parsing input: ' + error.message);
      return false;
    }
  };

  // Generate all algorithm steps
  const generateSortingSteps = () => {
    if (!parseGraph()) return;

    if (!nodes.includes(startNode)) {
      alert('Please select a valid start node');
      return;
    }

    const steps = [];
    const dist = {};
    const prev = {};
    const unvisited = new Set(nodes);

    // Initialize distances
    nodes.forEach(node => {
      dist[node] = node === startNode ? 0 : Infinity;
      prev[node] = null;
    });

    // Initial state
    steps.push({
      type: 'INITIALIZE',
      currentNode: null,
      visited: [],
      processing: [],
      distances: { ...dist },
      previous: { ...prev },
      explanation: `Initializing Dijkstra's algorithm with start node ${startNode}. Distance to start is 0, all others are infinity.`
    });

    // Main algorithm loop
    while (unvisited.size > 0) {
      // Find node with minimum distance
      let minDist = Infinity;
      let current = null;

      unvisited.forEach(node => {
        if (dist[node] < minDist) {
          minDist = dist[node];
          current = node;
        }
      });

      // No reachable nodes left
      if (current === null || dist[current] === Infinity) {
        steps.push({
          type: 'UNREACHABLE',
          currentNode: null,
          visited: [...nodes].filter(n => !unvisited.has(n)),
          processing: [],
          distances: { ...dist },
          previous: { ...prev },
          explanation: 'Algorithm completed. Some nodes are unreachable from the start node.'
        });
        break;
      }

      // Select current node
      steps.push({
        type: 'SELECT_NODE',
        currentNode: current,
        visited: [...nodes].filter(n => !unvisited.has(n)),
        processing: [],
        distances: { ...dist },
        previous: { ...prev },
        explanation: `Selected node ${current} with current shortest distance ${dist[current]}`
      });

      // Remove from unvisited
      unvisited.delete(current);

      // Add to visited in next step
      const visitedNodes = [...nodes].filter(n => !unvisited.has(n));

      // Process neighbors
      const neighbors = Object.keys(graph[current] || {});

      if (neighbors.length === 0) {
        steps.push({
          type: 'NO_NEIGHBORS',
          currentNode: current,
          visited: visitedNodes,
          processing: [],
          distances: { ...dist },
          previous: { ...prev },
          explanation: `Node ${current} has no outgoing edges`
        });
      }

      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor)) continue;

        const edgeWeight = graph[current][neighbor];
        const processingEdge = { from: current, to: neighbor };

        // Check neighbor
        steps.push({
          type: 'CHECK_NEIGHBOR',
          currentNode: current,
          visited: visitedNodes,
          processing: [processingEdge],
          distances: { ...dist },
          previous: { ...prev },
          explanation: `Checking edge ${current} → ${neighbor} with weight ${edgeWeight}`
        });

        // Calculate new distance
        const newDist = dist[current] + edgeWeight;

        if (newDist < dist[neighbor]) {
          // Update distance
          const oldDist = dist[neighbor];
          dist[neighbor] = newDist;
          prev[neighbor] = current;

          steps.push({
            type: 'UPDATE_DISTANCE',
            currentNode: current,
            visited: visitedNodes,
            processing: [processingEdge],
            distances: { ...dist },
            previous: { ...prev },
            explanation: `Found shorter path to ${neighbor}: ${oldDist === Infinity ? '∞' : oldDist} → ${newDist} via ${current}`
          });
        } else {
          steps.push({
            type: 'NO_UPDATE',
            currentNode: current,
            visited: visitedNodes,
            processing: [processingEdge],
            distances: { ...dist },
            previous: { ...prev },
            explanation: `No update needed for ${neighbor}: current distance ${dist[neighbor]} is already shorter than new path (${newDist})`
          });
        }
      }
    }

    // Final state
    steps.push({
      type: 'COMPLETE',
      currentNode: null,
      visited: nodes,
      processing: [],
      distances: { ...dist },
      previous: { ...prev },
      explanation: 'Algorithm completed. All reachable nodes have been processed.'
    });

    setSortingSteps(steps);
    setCurrentStep(-1);
    setCurrentNode(null);
    setVisitedNodes([]);
    setProcessingEdges([]);
    setDistances({});
    setPreviousNodes({});
  };

  // Reset visualization state
  const resetVisualization = () => {
    stopAutoPlay();
    setCurrentStep(-1);
    setCurrentNode(null);
    setVisitedNodes([]);
    setProcessingEdges([]);
    setDistances({});
    setPreviousNodes({});
    setIsSorting(false);
    setExplanation('Add nodes and edges, then start visualization');
  };

  // Move to next step
  const nextStep = () => {
    if (currentStep < sortingSteps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      applyStep(sortingSteps[nextStepIndex]);
    } else {
      stopAutoPlay();
    }
  };

  // Move to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      applyStep(sortingSteps[prevStepIndex]);
    }
  };

  // Apply a step's visualization
  const applyStep = (step) => {
    if (!step) return;

    setCurrentNode(step.currentNode);
    setVisitedNodes(step.visited || []);
    setProcessingEdges(step.processing || []);
    setDistances(step.distances || {});
    setPreviousNodes(step.previous || {});
    setExplanation(step.explanation || '');
  };

  // Start auto-playing steps
  const startAutoPlay = () => {
    if (currentStep >= sortingSteps.length - 1) {
      setCurrentStep(-1);
    }
    setIsAutoPlaying(true);
  };

  // Stop auto-playing
  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
    }
  };

  // Handle auto-playing effect
  useEffect(() => {
    if (isAutoPlaying && currentStep < sortingSteps.length - 1) {
      autoPlayRef.current = setTimeout(() => {
        nextStep();
      }, speed);
    } else if (currentStep >= sortingSteps.length - 1) {
      setIsAutoPlaying(false);
    }

    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, currentStep, sortingSteps.length, speed]);

  // Start visualization
  const startVisualization = () => {
    resetVisualization();
    generateSortingSteps();
    setIsSorting(true);
  };

  // Get node class based on its state
  const getNodeClass = (node) => {
    let className = "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300";

    if (node === startNode) {
      className += " border-4 border-yellow-300";
    }

    if (node === currentNode) {
      className += " bg-purple-600";
    } else if (visitedNodes.includes(node)) {
      className += " bg-green-500";
    } else {
      className += " bg-blue-500";
    }

    return className;
  };

  // Get edge class based on its state
  const getEdgeClass = (from, to) => {
    const isProcessing = processingEdges.some(edge => edge.from === from && edge.to === to);
    let className = "text-xs font-medium transition-all duration-300";

    if (isProcessing) {
      className += " text-red-500 font-bold";
    } else if (
      visitedNodes.includes(from) &&
      visitedNodes.includes(to) &&
      previousNodes[to] === from
    ) {
      className += " text-green-600 font-bold";
    } else {
      className += " text-gray-600";
    }

    return className;
  };

  // Format distance for display
  const formatDistance = (distance) => {
    return distance === Infinity ? '∞' : distance;
  };

  // Get shortest path to a node
  const getPathToNode = (node) => {
    if (!previousNodes[node]) return [];

    const path = [];
    let current = node;

    while (current) {
      path.unshift(current);
      current = previousNodes[current];
    }

    return path;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Dijkstra's Algorithm Visualization</h1>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 font-medium">Nodes (comma separated)</label>
          <input
            type="text"
            value={nodeInput}
            onChange={handleNodeInputChange}
            placeholder="A, B, C, D"
            className="w-full p-2 border border-gray-300 rounded"
            disabled={isSorting && currentStep > -1}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Edges (format: A-B:5, B-C:3)</label>
          <input
            type="text"
            value={edgeInput}
            onChange={handleEdgeInputChange}
            placeholder="A-B:5, B-C:3, A-C:7"
            className="w-full p-2 border border-gray-300 rounded"
            disabled={isSorting && currentStep > -1}
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex-grow max-w-xs">
          <label className="block mb-2 font-medium">Start Node</label>
          <select
            value={startNode}
            onChange={handleStartNodeChange}
            className="w-full p-2 border border-gray-300 rounded"
            disabled={isSorting && currentStep > -1}
          >
            {nodes.map(node => (
              <option key={node} value={node}>{node}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={generateRandomGraph}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded h-10"
            disabled={isSorting && currentStep > -1}
          >
            Generate Random
          </button>
          <button
            onClick={startVisualization}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded h-10"
            disabled={isSorting && currentStep > -1}
          >
            Initialize
          </button>
        </div>
      </div>

      {isSorting && (
        <>
          <div className="mb-8 bg-white p-4 rounded shadow">
            <div className="text-lg font-semibold mb-2">Step {currentStep + 1} of {sortingSteps.length}</div>
            <div className="p-4 bg-gray-100 rounded">
              {explanation}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <div className="flex-1 bg-gray-100 p-4 rounded shadow min-h-64 flex flex-col">
              <h2 className="text-lg font-bold mb-4">Graph Visualization</h2>
              <div className="flex-1 relative flex items-center justify-center">
                {/* Simple force-directed layout */}
                <div className="relative w-64 h-64">
                  {nodes.map((node, index) => {
                    // Position nodes in a circle
                    const angle = (2 * Math.PI * index) / nodes.length;
                    const radius = 100;
                    const x = 130 + radius * Math.cos(angle);
                    const y = 130 + radius * Math.sin(angle);

                    return (
                      <div
                        key={node}
                        className={getNodeClass(node)}
                        style={{
                          position: 'absolute',
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        {node}
                      </div>
                    );
                  })}

                  {/* Edges */}
                  <svg
                    viewBox="0 0 260 260"
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  >
                    {edges.map((edge, index) => {
                      // Find node positions
                      const fromIndex = nodes.indexOf(edge.from);
                      const toIndex = nodes.indexOf(edge.to);

                      const fromAngle = (2 * Math.PI * fromIndex) / nodes.length;
                      const toAngle = (2 * Math.PI * toIndex) / nodes.length;

                      const radius = 100;
                      const x1 = 130 + radius * Math.cos(fromAngle);
                      const y1 = 130 + radius * Math.sin(fromAngle);
                      const x2 = 130 + radius * Math.cos(toAngle);
                      const y2 = 130 + radius * Math.sin(toAngle);

                      // Midpoint for weight label
                      const mx = (x1 + x2) / 2;
                      const my = (y1 + y2) / 2;

                      // Direction vector
                      const dx = x2 - x1;
                      const dy = y2 - y1;
                      const len = Math.sqrt(dx * dx + dy * dy);

                      // Adjust line endpoints to not overlap with nodes
                      const nodeRadius = 25;
                      const fromX = x1 + (dx / len) * nodeRadius;
                      const fromY = y1 + (dy / len) * nodeRadius;
                      const toX = x2 - (dx / len) * nodeRadius;
                      const toY = y2 - (dy / len) * nodeRadius;

                      // Edge color
                      const isProcessing = processingEdges.some(e => e.from === edge.from && e.to === edge.to);
                      const isPath = visitedNodes.includes(edge.from) && visitedNodes.includes(edge.to) && previousNodes[edge.to] === edge.from;

                      let strokeColor = "#9CA3AF"; // Default gray
                      if (isProcessing) {
                        strokeColor = "#EF4444"; // Red
                      } else if (isPath) {
                        strokeColor = "#10B981"; // Green
                      }

                      return (
                        <g key={`${edge.from}-${edge.to}`}>
                          <line
                            x1={fromX}
                            y1={fromY}
                            x2={toX}
                            y2={toY}
                            stroke={strokeColor}
                            strokeWidth="2"
                          />
                          <circle
                            cx={mx}
                            cy={my}
                            r="10"
                            fill="white"
                            stroke={strokeColor}
                          />
                          <text
                            x={mx}
                            y={my}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="10"
                            className={getEdgeClass(edge.from, edge.to)}
                          >
                            {edge.weight}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-gray-100 p-4 rounded shadow">
              <h2 className="text-lg font-bold mb-4">Distances</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 text-left">Node</th>
                    <th className="border p-2 text-left">Distance</th>
                    <th className="border p-2 text-left">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(node => (
                    <tr key={node}>
                      <td className={`border p-2 ${node === currentNode ? 'bg-purple-100' : ''}`}>
                        {node}
                      </td>
                      <td className={`border p-2 ${node === currentNode ? 'bg-purple-100' : ''}`}>
                        {formatDistance(distances[node] || Infinity)}
                      </td>
                      <td className={`border p-2 ${node === currentNode ? 'bg-purple-100' : ''}`}>
                        {getPathToNode(node).join(' → ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={prevStep}
              disabled={currentStep <= 0}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white p-2 rounded"
            >
              Previous Step
            </button>

            {isAutoPlaying ? (
              <button
                onClick={stopAutoPlay}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={startAutoPlay}
                disabled={currentStep >= sortingSteps.length - 1}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white p-2 rounded"
              >
                Auto Play
              </button>
            )}

            <button
              onClick={nextStep}
              disabled={currentStep >= sortingSteps.length - 1}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-2 rounded"
            >
              Next Step
            </button>

            <button
              onClick={resetVisualization}
              className="bg-gray-700 hover:bg-gray-800 text-white p-2 rounded"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <span>Speed:</span>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              className="w-64"
            />
            <span>{speed}ms</span>
          </div>
        </>
      )}

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-2">How Dijkstra's Algorithm Works</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Initialize distances: set distance to start node as 0, all others as infinity</li>
          <li>Create a set of unvisited nodes</li>
          <li>While there are unvisited nodes:
            <ul className="list-disc pl-6 mt-1">
              <li>Select unvisited node with smallest distance</li>
              <li>Mark it as visited</li>
              <li>For each neighbor, calculate new distance through current node</li>
              <li>If new distance is less than known distance, update the distance</li>
            </ul>
          </li>
          <li>Once done, shortest paths from start node to all other nodes are calculated</li>
        </ol>
      </div>
    </div>
  );
};

export default DijkstraVisualization;