import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Maximize } from 'lucide-react';
import { GraphData, Node, Link as GraphLink } from '../types';

interface AttackGraphProps {
  data: GraphData;
}

export default function AttackGraph({ data }: AttackGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetZoomRef = useRef<(() => void) | null>(null);
  const selectedNodeIdRef = useRef<string | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const [cvssThreshold, setCvssThreshold] = useState<number>(0);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 500;
    
    // --- 1. INITIALIZATION (Run once) ---
    const svg = d3.select(svgRef.current);
    if (svg.select("g.zoom-container").empty()) {
      svg.attr("width", width)
         .attr("height", height)
         .attr("viewBox", [0, 0, width, height]);

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          svg.select("g.zoom-container").attr("transform", event.transform);
        });
      svg.call(zoom).on("dblclick.zoom", null);
      
      resetZoomRef.current = () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
      };

      const zoomGroup = svg.append("g").attr("class", "zoom-container");

      // Define arrow markers for links
      zoomGroup.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("xoverflow", "visible")
        .append("svg:path")
        .attr("d", "M 0,-5 L 10 ,0 L 0,5")
        .attr("fill", "#999")
        .style("stroke", "none");

      zoomGroup.append("g").attr("class", "links-layer");
      zoomGroup.append("g").attr("class", "nodes-layer");
    }

    const g = svg.select("g.zoom-container");
    const linksLayer = g.select("g.links-layer");
    const nodesLayer = g.select("g.nodes-layer");

    // --- 2. DATA PREPARATION ---
    // Filter nodes and links based on CVSS threshold
    const filteredNodes = data.nodes.filter(n => n.cvss === undefined || n.cvss >= cvssThreshold);
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = data.links.filter(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    // Preserve existing node positions to prevent layout jumping
    const existingNodes = new Map();
    nodesLayer.selectAll("g.node").each(function(d: any) {
      existingNodes.set(d.id, { x: d.x, y: d.y, vx: d.vx, vy: d.vy, fx: d.fx, fy: d.fy });
    });

    const nodes = filteredNodes.map(d => ({
      ...d,
      ...(existingNodes.get(d.id) || {})
    }));
    const links = filteredLinks.map(d => ({ ...d }));

    // --- 3. PHYSICS SIMULATION ---
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    // --- 4. RENDER LINKS ---
    const link = linksLayer
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links, (d: any) => {
        const s = typeof d.source === 'object' ? d.source.id : d.source;
        const t = typeof d.target === 'object' ? d.target.id : d.target;
        return `${s}-${t}`;
      })
      .join(
        enter => enter.append("line")
          .attr("stroke-width", 2)
          .attr("marker-end", "url(#arrowhead)")
          .style("opacity", 0)
          .call(e => e.transition().duration(500).style("opacity", 1)),
        update => update,
        exit => exit.transition().duration(500).style("opacity", 0).remove()
      );

    // --- 5. RENDER NODES ---
    const nodeColors = {
      attacker: "#ef4444", // red
      host: "#3b82f6", // blue
      service: "#10b981", // green
      vulnerability: "#f59e0b" // orange
    };

    const node = nodesLayer
      .selectAll("g.node")
      .data(nodes, (d: any) => d.id)
      .join(
        enter => {
          const nodeEnter = enter.append("g")
            .attr("class", "node")
            .style("opacity", 0)
            .call(d3.drag<any, any>()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));

          nodeEnter.append("circle")
            .attr("r", 12)
            .attr("fill", (d: any) => (nodeColors as any)[d.type] || "#6b7280")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

          nodeEnter.append("text")
            .text((d: any) => d.label)
            .attr("x", 16)
            .attr("y", 4)
            .attr("font-family", "sans-serif")
            .attr("font-size", "12px")
            .attr("fill", "currentColor")
            .attr("class", "dark:fill-gray-300 fill-gray-700");

          nodeEnter.append("title")
            .text((d: any) => `${d.label} (${d.type})${d.cve ? `\nCVE: ${d.cve}` : ''}${d.cvss ? `\nCVSS: ${d.cvss}` : ''}`);

          nodeEnter.transition().duration(500).style("opacity", 1);
          return nodeEnter;
        },
        update => update,
        exit => exit.transition().duration(500).style("opacity", 0).remove()
      )
      .on("mouseover", function(event, d) {
        hoveredNodeIdRef.current = d.id;
        updateHighlightState();
      })
      .on("mouseout", function(event, d) {
        hoveredNodeIdRef.current = null;
        updateHighlightState();
      })
      .on("click", function(event, d) {
        if (selectedNodeIdRef.current === d.id) {
          selectedNodeIdRef.current = null;
        } else {
          selectedNodeIdRef.current = d.id;
        }
        updateHighlightState();
      });

    function updateHighlightState() {
      const activeId = hoveredNodeIdRef.current || selectedNodeIdRef.current;
      
      if (!activeId) {
         link.transition().duration(200)
             .attr("stroke", "#999")
             .attr("stroke-opacity", 0.6)
             .attr("stroke-width", 2);
         node.transition().duration(200).style("opacity", 1);
         node.selectAll("circle").transition().duration(200)
             .attr("r", 12)
             .attr("stroke", "#fff")
             .attr("stroke-width", 2);
         return;
      }
      
      const pathNodeIds = new Set<string>();
      const pathLinkIds = new Set<string>();
      
      const queueBack = [activeId];
      const visitedBack = new Set<string>([activeId]);
      while (queueBack.length > 0) {
        const current = queueBack.shift()!;
        pathNodeIds.add(current);
        links.forEach((l: any) => {
          if (!l.source || !l.target) return;
          const s = (typeof l.source === 'object' ? l.source.id : l.source) as string;
          const t = (typeof l.target === 'object' ? l.target.id : l.target) as string;
          if (t === current) {
            pathLinkIds.add(`${s}-${t}`);
            if (!visitedBack.has(s)) {
              visitedBack.add(s);
              queueBack.push(s);
            }
          }
        });
      }

      const queueFwd = [activeId];
      const visitedFwd = new Set<string>([activeId]);
      while (queueFwd.length > 0) {
        const current = queueFwd.shift()!;
        pathNodeIds.add(current);
        links.forEach((l: any) => {
          if (!l.source || !l.target) return;
          const s = (typeof l.source === 'object' ? l.source.id : l.source) as string;
          const t = (typeof l.target === 'object' ? l.target.id : l.target) as string;
          if (s === current) {
            pathLinkIds.add(`${s}-${t}`);
            if (!visitedFwd.has(t)) {
              visitedFwd.add(t);
              queueFwd.push(t);
            }
          }
        });
      }
      
      const isClicked = activeId === selectedNodeIdRef.current;
      const activeColor = isClicked ? "#ef4444" : "#3b82f6";

      link.transition().duration(200)
          .attr("stroke", (l: any) => {
             const s = typeof l.source === 'object' ? l.source.id : l.source;
             const t = typeof l.target === 'object' ? l.target.id : l.target;
             return pathLinkIds.has(`${s}-${t}`) ? activeColor : "#999";
          })
          .attr("stroke-opacity", (l: any) => {
             const s = typeof l.source === 'object' ? l.source.id : l.source;
             const t = typeof l.target === 'object' ? l.target.id : l.target;
             return pathLinkIds.has(`${s}-${t}`) ? 1 : 0.1;
          })
          .attr("stroke-width", (l: any) => {
             const s = typeof l.source === 'object' ? l.source.id : l.source;
             const t = typeof l.target === 'object' ? l.target.id : l.target;
             return pathLinkIds.has(`${s}-${t}`) ? 3 : 2;
          });
          
      node.transition().duration(200)
          .style("opacity", (n: any) => pathNodeIds.has(n.id) ? 1 : 0.1);
      
      node.selectAll("circle").transition().duration(200)
          .attr("r", (n: any) => n.id === activeId ? 16 : 12)
          .attr("stroke", (n: any) => n.id === activeId ? activeColor : "#fff")
          .attr("stroke-width", (n: any) => n.id === activeId ? 4 : 2);
    }

    // --- 6. SIMULATION TICKS & DRAG LOGIC ---
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Gentle restart to let nodes adjust to new links/forces
    simulation.alpha(0.3).restart();

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
      if (svgRef.current) {
        d3.select(svgRef.current).on(".zoom", null);
      }
    };
  }, [data, cvssThreshold]);

  const handleResetView = () => {
    if (resetZoomRef.current) {
      resetZoomRef.current();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <label htmlFor="cvss-slider" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Minimum CVSS Score: <span className="font-bold text-blue-600 dark:text-blue-400">{cvssThreshold.toFixed(1)}</span>
        </label>
        <input
          id="cvss-slider"
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={cvssThreshold}
          onChange={(e) => setCvssThreshold(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          10.0 (Critical)
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 shrink-0"></div>
        <button
          onClick={handleResetView}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors whitespace-nowrap"
          title="Reset View"
        >
          <Maximize className="w-4 h-4" />
          Reset View
        </button>
      </div>
      
      <div ref={containerRef} className="w-full h-[500px] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm relative">
        <svg ref={svgRef} className="w-full h-full" />
        <div className="absolute top-4 left-4 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-md border border-gray-200 dark:border-gray-800 text-xs shadow-sm">
          <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Legend</h4>
          <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Attacker</div>
          <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Host</div>
          <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Service</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Vulnerability</div>
        </div>
      </div>
    </div>
  );
}
