# typed: false
# frozen_string_literal: true

# Homebrew formula for the Crumbless CLI (prebuilt binaries from GitHub Releases).
#
# Install (dedicated tap, kept in sync by the cli-v* release workflow):
#   brew tap crumblessso/tap https://github.com/crumblessai/homebrew-tap
#   brew install crumbless
#
# SHA256 placeholders below are filled by .github/workflows/release.yml on each v* tag.

class Crumbless < Formula
  desc "Command-line client for Crumbless — social media AI autopilot"
  homepage "https://crumbless.ai"
  version "0.1.0"
  license "AGPL-3.0-or-later"

  livecheck do
    url "https://github.com/crumblessai/crumbless-cli/releases/latest"
    strategy :github_latest
  end

  on_macos do
    on_arm do
      url "https://github.com/crumblessai/crumbless-cli/releases/download/v#{version}/crumbless-macos-arm64.tar.gz"
      sha256 "REPLACE_SHA256_MACOS_ARM64"
    end
    on_intel do
      url "https://github.com/crumblessai/crumbless-cli/releases/download/v#{version}/crumbless-macos-x64.tar.gz"
      sha256 "REPLACE_SHA256_MACOS_X64"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/crumblessai/crumbless-cli/releases/download/v#{version}/crumbless-linux-arm64.tar.gz"
      sha256 "REPLACE_SHA256_LINUX_ARM64"
    end
    on_intel do
      url "https://github.com/crumblessai/crumbless-cli/releases/download/v#{version}/crumbless-linux-x64.tar.gz"
      sha256 "REPLACE_SHA256_LINUX_X64"
    end
  end

  def install
    binary = Dir["crumbless-*"].first
    odie "Crumbless binary missing from archive" if binary.nil?
    bin.install binary => "crumbless"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/crumbless --version")
  end
end
