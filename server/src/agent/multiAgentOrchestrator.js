import { runTool } from "../tools/index.js";

const baseAgents = [
  {
    id: "intent-agent",
    name: "Intent Agent",
    role: "Understands destination, dates, travelers, and request type.",
    status: "complete",
  },
  {
    id: "planner-agent",
    name: "Planner Agent",
    role: "Builds the execution plan and decides which specialists should run.",
    status: "complete",
  },
];

const toolAgentMap = {
  getWeather: {
    id: "weather-agent",
    name: "Weather Agent",
    role: "Checks forecast context for timing, packing, and pacing.",
  },
  getPlaces: {
    id: "places-agent",
    name: "Places Agent",
    role: "Finds city highlights, attractions, neighborhoods, and route anchors.",
  },
  estimateCost: {
    id: "budget-agent",
    name: "Budget Agent",
    role: "Estimates realistic trip cost by city, days, travelers, and style.",
  },
  searchFlights: {
    id: "flight-search-agent",
    name: "Flight Search Agent",
    role: "Checks flight offers only when requested. It does not book tickets.",
  },
  getFoodGuide: {
    id: "food-agent",
    name: "Food Agent",
    role: "Explains local dishes, food areas, and casual meal budgets.",
  },
  getTravelGuide: {
    id: "logistics-agent",
    name: "Logistics Agent",
    role: "Answers transport, safety, stays, packing, and practical trip questions.",
  },
  getPlaceInsight: {
    id: "place-insight-agent",
    name: "Place Insight Agent",
    role: "Explains specific places and seasonal choices like monsoon waterfalls or winter hill stations.",
  },
};

const synthesisAgent = {
  id: "synthesis-agent",
  name: "Synthesis Agent",
  role: "Combines specialist results into the final chat response and structured UI data.",
  status: "waiting",
};

const memoryAgent = {
  id: "memory-agent",
  name: "Memory Agent",
  role: "Uses saved preferences and learns travel style over time.",
  status: "complete",
};

const bookingAgent = {
  id: "booking-handoff-agent",
  name: "Booking Handoff Agent",
  role: "Creates safe next steps for hotels, maps, restaurants, and transport without completing bookings.",
  status: "waiting",
};

const noop = () => {};

export function buildAgentTeam(plan, memory = {}) {
  const agents = [...baseAgents, memoryAgent];
  const seen = new Set(agents.map((agent) => agent.id));

  for (const toolCall of plan.tools ?? []) {
    const agent = toolAgentMap[toolCall.name];

    if (agent && !seen.has(agent.id)) {
      seen.add(agent.id);
      agents.push({
        ...agent,
        status: "waiting",
      });
    }
  }

  if (plan.intent === "trip_plan") {
    agents.push({
      ...bookingAgent,
      status: "waiting",
    });
  }

  agents.push(synthesisAgent);

  return agents.map((agent) => ({
    ...agent,
    memoryUsed: agent.id === "memory-agent" ? hasUsefulMemory(memory) : undefined,
  }));
}

export async function runSpecialistAgents({
  plan,
  memory = {},
  emit = noop,
}) {
  const agentTeam = buildAgentTeam(plan, memory);

  emit("agent:team", {
    agents: agentTeam,
  });

  emit("agent:delegate", {
    agentId: "memory-agent",
    agentName: "Memory Agent",
    status: "complete",
    detail: hasUsefulMemory(memory)
      ? "Loaded saved travel preferences for this session."
      : "No strong saved preferences yet; this run can teach the assistant.",
  });

  const toolJobs = (plan.tools ?? []).map((toolCall) => runToolAgent({
    toolCall,
    emit,
  }));

  const toolResults = await Promise.all(toolJobs);

  emit("agent:delegate", {
    agentId: "booking-handoff-agent",
    agentName: "Booking Handoff Agent",
    status: plan.intent === "trip_plan" ? "ready" : "skipped",
    detail: plan.intent === "trip_plan"
      ? "Preparing booking-ready links and checklist without making reservations."
      : "Not needed for this direct travel answer.",
  });

  emit("agent:delegate", {
    agentId: "synthesis-agent",
    agentName: "Synthesis Agent",
    status: "running",
    detail: "Combining specialist outputs into a structured response.",
  });

  return {
    agentTeam: markAgentTeamComplete(agentTeam, toolResults, plan.intent),
    toolResults,
  };
}

export function buildBookingHandoff(structuredPlan) {
  const destination = structuredPlan.destination || "destination";
  const places = structuredPlan.places?.slice(0, 4).map((place) => place.name) ?? [];
  const searchQuery = [destination, ...places.slice(0, 2)].join(" ");

  return {
    status: "planning-only",
    note: "This app prepares booking decisions but does not reserve rooms, tickets, or transport.",
    actions: [
      {
        label: "Compare stays",
        type: "stay-search",
        url: `https://www.google.com/travel/hotels/${encodeURIComponent(destination)}`,
      },
      {
        label: "Open route map",
        type: "map",
        url: `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`,
      },
      {
        label: "Find restaurants",
        type: "food-search",
        url: `https://www.google.com/maps/search/${encodeURIComponent(`${destination} best local food`)}`,
      },
    ],
    checklist: [
      "Shortlist stay area before booking any hotel.",
      "Check recent reviews, cancellation policy, and distance from day-one stops.",
      "Keep transport booking separate from the city itinerary until dates are final.",
    ],
  };
}

function runToolAgent({ toolCall, emit }) {
  const agent = toolAgentMap[toolCall.name] ?? {
    id: "tool-agent",
    name: "Tool Agent",
    role: "Runs a travel tool.",
  };

  emit("agent:delegate", {
    agentId: agent.id,
    agentName: agent.name,
    status: "running",
    detail: toolCall.reason,
  });

  emit("agent:tool", {
    agentId: agent.id,
    agentName: agent.name,
    name: toolCall.name,
    status: "running",
    reason: toolCall.reason,
  });

  return runTool(toolCall.name, toolCall.args)
    .then((result) => {
      emit("agent:tool", {
        agentId: agent.id,
        agentName: agent.name,
        name: toolCall.name,
        status: "complete",
        result,
      });
      emit("agent:delegate", {
        agentId: agent.id,
        agentName: agent.name,
        status: "complete",
        detail: result?.source ?? `${toolCall.name} complete`,
      });

      return {
        name: toolCall.name,
        agentId: agent.id,
        agentName: agent.name,
        status: "success",
        result,
      };
    })
    .catch((error) => {
      const result = {
        message: error.message,
        source: "tool-error",
      };

      emit("agent:tool", {
        agentId: agent.id,
        agentName: agent.name,
        name: toolCall.name,
        status: "error",
        result,
      });
      emit("agent:delegate", {
        agentId: agent.id,
        agentName: agent.name,
        status: "error",
        detail: error.message,
      });

      return {
        name: toolCall.name,
        agentId: agent.id,
        agentName: agent.name,
        status: "error",
        result,
      };
    });
}

function markAgentTeamComplete(agentTeam, toolResults, intent) {
  const completeAgentIds = new Set(toolResults.map((result) => result.agentId));

  return agentTeam.map((agent) => {
    if (agent.id === "booking-handoff-agent") {
      return {
        ...agent,
        status: intent === "trip_plan" ? "complete" : "skipped",
      };
    }

    if (agent.id === "synthesis-agent") {
      return {
        ...agent,
        status: "complete",
      };
    }

    if (completeAgentIds.has(agent.id) || agent.status === "complete") {
      return {
        ...agent,
        status: "complete",
      };
    }

    return {
      ...agent,
      status: "skipped",
    };
  });
}

function hasUsefulMemory(memory) {
  return Boolean(
    memory?.lastDestination ||
      memory?.budgetStyle ||
      memory?.travelers ||
      memory?.interests?.length ||
      memory?.foodPreferences?.length,
  );
}
