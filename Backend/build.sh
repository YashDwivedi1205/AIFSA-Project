#!/bin/bash
# Exit on error
set -o errexit

# 1. Install all Python packages
pip install -r requirements.txt

# 2. Download the NLTK vader_lexicon (Sentiment model)
python -m nltk.downloader vader_lexicon