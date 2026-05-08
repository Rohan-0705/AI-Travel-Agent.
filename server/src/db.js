import mongoose from "mongoose";

let ConversationModel = null;
let SavedTripModel = null;
let SearchHistoryModel = null;
let TravelMemoryModel = null;

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    return { enabled: false, reason: "MONGO_URI not set" };
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    const conversationSchema = new mongoose.Schema(
      {
        sessionId: { type: String, index: true, required: true },
        provider: String,
        userMessage: String,
        assistantMessage: String,
        structuredPlan: mongoose.Schema.Types.Mixed,
        toolResults: mongoose.Schema.Types.Mixed,
      },
      { timestamps: true },
    );

    ConversationModel =
      mongoose.models.Conversation ??
      mongoose.model("Conversation", conversationSchema);

    const savedTripSchema = new mongoose.Schema(
      {
        clientId: { type: String, index: true, default: "default" },
        clientItemId: { type: String, index: true },
        title: String,
        destination: { type: String, index: true },
        summary: String,
        days: Number,
        travelers: Number,
        budget: String,
        structuredPlan: mongoose.Schema.Types.Mixed,
      },
      { timestamps: true },
    );

    SavedTripModel =
      mongoose.models.SavedTrip ?? mongoose.model("SavedTrip", savedTripSchema);

    const searchHistorySchema = new mongoose.Schema(
      {
        clientId: { type: String, index: true, default: "default" },
        clientItemId: { type: String, index: true },
        sessionId: { type: String, index: true },
        message: String,
        destination: String,
        intent: String,
      },
      { timestamps: true },
    );

    SearchHistoryModel =
      mongoose.models.SearchHistory ??
      mongoose.model("SearchHistory", searchHistorySchema);

    const travelMemorySchema = new mongoose.Schema(
      {
        clientId: { type: String, unique: true, index: true, default: "default" },
        lastDestination: String,
        budgetStyle: String,
        travelers: Number,
        interests: [String],
        foodPreferences: [String],
        preferredPace: String,
        updatedFrom: String,
      },
      { timestamps: true },
    );

    TravelMemoryModel =
      mongoose.models.TravelMemory ??
      mongoose.model("TravelMemory", travelMemorySchema);

    return { enabled: true };
  } catch (error) {
    console.warn(`MongoDB disabled: ${error.message}`);
    return { enabled: false, reason: error.message };
  }
}

export async function saveConversation(entry) {
  if (!ConversationModel) {
    return null;
  }

  return ConversationModel.create(entry);
}

export async function saveTrip(entry) {
  if (!SavedTripModel) {
    return null;
  }

  return SavedTripModel.create(entry);
}

export async function listSavedTrips(clientId = "default") {
  if (!SavedTripModel) {
    return [];
  }

  return SavedTripModel.find({ clientId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(30)
    .lean();
}

export async function deleteSavedTrip({ id, clientId = "default" }) {
  if (!SavedTripModel || !id) {
    return { deletedCount: 0 };
  }

  const query = mongoose.Types.ObjectId.isValid(id)
    ? { clientId, $or: [{ _id: id }, { clientItemId: id }] }
    : { clientId, clientItemId: id };

  return SavedTripModel.deleteOne(query);
}

export async function saveSearchHistory(entry) {
  if (!SearchHistoryModel) {
    return null;
  }

  if (entry.clientItemId) {
    return SearchHistoryModel.findOneAndUpdate(
      {
        clientId: entry.clientId ?? "default",
        clientItemId: entry.clientItemId,
      },
      { $set: entry },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  return SearchHistoryModel.create(entry);
}

export async function listSearchHistory(clientId = "default") {
  if (!SearchHistoryModel) {
    return [];
  }

  return SearchHistoryModel.find({ clientId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(40)
    .lean();
}

export async function deleteSearchHistory({ id, clientId = "default" }) {
  if (!SearchHistoryModel || !id) {
    return { deletedCount: 0 };
  }

  const query = mongoose.Types.ObjectId.isValid(id)
    ? { clientId, $or: [{ _id: id }, { clientItemId: id }] }
    : { clientId, clientItemId: id };

  return SearchHistoryModel.deleteOne(query);
}

export async function getTravelMemory(clientId = "default") {
  if (!TravelMemoryModel) {
    return createDefaultMemory(clientId);
  }

  const memory = await TravelMemoryModel.findOne({ clientId }).lean();

  return memory ?? createDefaultMemory(clientId);
}

export async function updateTravelMemory({
  clientId = "default",
  message = "",
  structuredPlan = {},
}) {
  const learned = learnMemory({ message, structuredPlan });

  if (!TravelMemoryModel) {
    return {
      ...createDefaultMemory(clientId),
      ...learned,
    };
  }

  const existing = await TravelMemoryModel.findOne({ clientId }).lean();
  const nextMemory = mergeMemory(existing ?? createDefaultMemory(clientId), learned);

  await TravelMemoryModel.updateOne(
    { clientId },
    {
      $set: {
        ...nextMemory,
        clientId,
        updatedFrom: "agent-run",
      },
    },
    { upsert: true },
  );

  return nextMemory;
}

export async function saveTravelMemory({ clientId = "default", memory = {} }) {
  const cleanMemory = mergeMemory(createDefaultMemory(clientId), memory);

  if (!TravelMemoryModel) {
    return cleanMemory;
  }

  await TravelMemoryModel.updateOne(
    { clientId },
    {
      $set: {
        ...cleanMemory,
        clientId,
        updatedFrom: "manual",
      },
    },
    { upsert: true },
  );

  return cleanMemory;
}

function learnMemory({ message, structuredPlan }) {
  const lower = String(message ?? "").toLowerCase();
  const budgetStyle = lower.includes("premium") || lower.includes("luxury")
    ? "premium"
    : lower.includes("cheap") || lower.includes("affordable") || lower.includes("budget")
      ? "budget"
      : structuredPlan?.cost?.style ?? "";
  const preferredPace = lower.includes("slow") || lower.includes("calm") || lower.includes("relax")
    ? "slow"
    : lower.includes("active") || lower.includes("adventure")
      ? "active"
      : "";
  const foodPreferences = [
    lower.includes("veg") || lower.includes("vegetarian") ? "vegetarian" : "",
    lower.includes("seafood") ? "seafood" : "",
    lower.includes("street food") ? "street food" : "",
  ].filter(Boolean);

  return {
    lastDestination: structuredPlan?.destination ?? "",
    budgetStyle,
    travelers: Number(structuredPlan?.travelers) || 0,
    interests: inferInterests(lower, structuredPlan),
    foodPreferences,
    preferredPace,
  };
}

function inferInterests(lower, structuredPlan) {
  const interests = [
    lower.includes("food") ? "food" : "",
    lower.includes("beach") ? "beaches" : "",
    lower.includes("temple") ? "temples" : "",
    lower.includes("fort") || lower.includes("history") ? "heritage" : "",
    lower.includes("nature") || lower.includes("wildlife") ? "nature" : "",
    lower.includes("shopping") || lower.includes("market") ? "markets" : "",
  ].filter(Boolean);

  const placeTypes = structuredPlan?.places
    ?.slice(0, 6)
    .map((place) => place.type)
    .filter(Boolean) ?? [];

  return [...new Set([...interests, ...placeTypes])].slice(0, 8);
}

function mergeMemory(existing, learned) {
  return {
    clientId: existing.clientId ?? "default",
    lastDestination: learned.lastDestination || existing.lastDestination || "",
    budgetStyle: learned.budgetStyle || existing.budgetStyle || "",
    travelers: learned.travelers || existing.travelers || 0,
    interests: mergeLists(existing.interests, learned.interests),
    foodPreferences: mergeLists(existing.foodPreferences, learned.foodPreferences),
    preferredPace: learned.preferredPace || existing.preferredPace || "",
  };
}

function mergeLists(a = [], b = []) {
  return [...new Set([...a, ...b].filter(Boolean).map(String))].slice(0, 10);
}

function createDefaultMemory(clientId = "default") {
  return {
    clientId,
    lastDestination: "",
    budgetStyle: "",
    travelers: 0,
    interests: [],
    foodPreferences: [],
    preferredPace: "",
  };
}
