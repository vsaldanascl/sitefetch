# Memory Bank

## Product Context

### Why this project exists
Sitefetch is a tool designed to fetch entire websites and save them as text files, specifically optimized for use with AI models. It provides an efficient way to capture web content in a format that's easily consumable by language models.

### What problems it solves
- Simplifies the process of converting web content to plain text
- Handles concurrent requests for faster site fetching
- Provides selective page matching for targeted content extraction
- Offers customizable content selection through CSS selectors
- Makes web content easily digestible for AI model training/usage
- Efficiently handles large sites through streaming and memory management

### How it should work
1. Accept a website URL as input
2. Fetch pages based on specified patterns (optional)
3. Extract readable content using mozilla/readability
4. Convert HTML to Markdown format
5. Save the content to a text file (streaming or batch mode)
6. Support both CLI and programmatic usage
7. Monitor and manage memory usage for large sites

## System Patterns

### Architecture
- CLI interface for command-line usage
- Programmatic API for integration into other projects
- Modular design with separate concerns:
  - CLI handling
  - Content fetching
  - HTML parsing
  - Markdown conversion
  - Logging
  - Memory management
  - Streaming processing

### Key Technical Decisions
1. Built with TypeScript for type safety
2. Uses mozilla/readability for content extraction
3. Implements concurrent fetching for performance
4. Supports flexible pattern matching via micromatch
5. Converts content to Markdown using turndown
6. Provides both global installation and one-off usage options
7. Implements streaming mode for memory efficiency
8. Monitors memory usage with configurable limits

## Tech Context

### Technologies Used
- **Core Dependencies:**
  - happy-dom: HTML parsing
  - cheerio: HTML manipulation
  - gpt-tokenizer: Token handling
  - turndown: HTML to Markdown conversion
  - micromatch: Pattern matching
  - @mozilla/readability: Content extraction
  - cac: CLI argument parsing
  - p-queue: Concurrent request handling

### Development Setup
- TypeScript-based project
- Uses rolldown for building
- ESM module format
- Supports multiple package managers (npm, pnpm, bun)

### Technical Constraints
- Node.js/Bun runtime environment required
- Output format optimized for AI model consumption
- Memory usage managed through streaming and monitoring
- Performance vs memory usage trade-offs configurable

## Progress

### What Works
- Basic site fetching functionality
- Concurrent request handling
- Pattern-based page matching
- Custom content selector support
- CLI interface
- Programmatic API
- Streaming mode for memory efficiency
- Memory usage monitoring
- Incremental file writing
- Enhanced garbage collection

### What's Left to Build
- Test suite implementation
- Additional content processing options
- Enhanced error handling
- Progress reporting improvements
- Documentation expansion
- Memory usage optimization fine-tuning

### Status
- Current Version: 0.0.17
- Package published on npm
- Core functionality implemented
- Memory optimization implemented
- Testing infrastructure needed

## Active Context

### Current Focus
- Memory optimization implementation
- Large site handling improvements

### Recent Changes
- Added streaming mode for memory-efficient processing
- Implemented memory usage monitoring
- Added incremental file writing
- Enhanced garbage collection in stream mode
- Added memory limit configuration options

### Next Steps
1. Test memory optimizations with large sites
2. Fine-tune memory management parameters
3. Implement test suite
4. Enhance error handling
5. Add progress reporting features
6. Expand documentation
