import logging
import time
from typing import Dict, Any, List
from fastmcp import FastMCP
from fastmcp.tools import tool

# Create the FastMCP server
mcp = FastMCP("IBM Bob Analyzer")


class BobStorage:
    """Simple in-memory storage for Bob's insights"""
    _latest_insights = None

    @classmethod
    def update(cls, data: Dict[str, Any]):
        cls._latest_insights = data

    @classmethod
    def get(cls):
        return cls._latest_insights


# --- Standalone MCP Tools (registered with mcp.add_tool below) ---

@tool
def submit_repository_insights(
    architecture_overview: str,
    architecture_patterns: List[str],
    hardware_mapping: str,
    control_flow: str,
    communication_protocols: List[str],
    risks: List[str],
    onboarding_pitch: str
) -> str:
    """
    Tool for IBM Bob to submit engineering insights discovered during repository analysis.
    Call this tool when you have finished reasoning through the codebase.
    """
    insights = {
        "metadata": {
            "engine": "IBM Bob (Real-time IDE Integration)",
            "timestamp": time.time(),
            "status": "success"
        },
        "insights": {
            "architecture": {
                "overview": architecture_overview,
                "patterns": architecture_patterns,
                "tech_stack": ["Detected by Bob"]
            },
            "hardware_mapping": {
                "resource_utilization": hardware_mapping,
                "deployment_targets": ["Live Detection"],
                "io_strategy": "Async detected"
            },
            "control_flow": {
                "primary_pipeline": control_flow,
                "error_handling": "Inferred from code"
            },
            "communication": {
                "internal": "Real-time discovery",
                "external": "Real-time discovery",
                "protocols": communication_protocols
            },
            "risks": risks,
            "onboarding_summary": {
                "tldr": onboarding_pitch,
                "quick_start": "Follow Bob's guidance in the IDE.",
                "key_files": ["Analyzed by Bob"]
            }
        }
    }

    BobStorage.update(insights)
    return "Insights successfully pushed to the Repository Analyzer UI."


# Register the standalone tool with the MCP server
mcp.add_tool(submit_repository_insights)


# --- Prompt ---

@mcp.prompt()
def repository_deep_dive(repo_name: str) -> str:
    """
    A structured prompt for IBM Bob to perform a comprehensive engineering audit.
    """
    return f"""
    Analyze the repository '{repo_name}' with high technical precision.
    Focus on:
    1. Architectural patterns and structural integrity.
    2. Hardware dependencies and resource mapping.
    3. Critical control flow and state management.
    4. Communication protocols and data flow.
    5. Identifying technical risks and security debt.

    After your analysis, use the 'submit_repository_insights' tool to visualize your findings.
    """


# --- Analyzer Class ---

class BobAnalyzer:
    """
    IBM Bob Analysis Service — coordinates with MCP and provides fallback logic.
    """

    def __init__(self):
        self.logger = logging.getLogger("BobAnalyzer")

    async def analyze_repo_fallback(self, repo_name: str, file_list: list) -> dict:
        """
        Fallback analysis for when Bob isn't providing real-time data.
        """
        stored = BobStorage.get()
        if stored:
            return stored

        return {
            "metadata": {"engine": "IBM Bob Fallback", "status": "waiting"},
            "insights": None,
            "message": "Waiting for real-time insights from IBM Bob IDE. Please use Bob to analyze the repo."
        }


if __name__ == "__main__":
    # When run directly, start the MCP server
    mcp.run()
