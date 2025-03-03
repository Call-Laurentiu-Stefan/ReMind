import io
import requests
import sys
from sumy.parsers.html import HtmlParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer
from sumy.summarizers.lex_rank import LexRankSummarizer
from sumy.summarizers.kl import KLSummarizer
from sumy.summarizers.luhn import LuhnSummarizer
from sumy.summarizers.text_rank import TextRankSummarizer
from sumy.summarizers.sum_basic import SumBasicSummarizer
from sumy.utils import get_stop_words
from langdetect import detect 
from sumy.nlp.stemmers import Stemmer 

LANGUAGE = "english"
SENTENCES_COUNT = 4
SUMMARY_ALGORITHMS = [LexRankSummarizer, LsaSummarizer, LuhnSummarizer, TextRankSummarizer, KLSummarizer, SumBasicSummarizer]

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def detect_language(text):
    try:
        return detect(text)
    except Exception as e:
        print("Error detecting language:", e)
        return None

def fetch_page_content(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,ro;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
    }
    
    response = requests.get(url, headers=headers, verify=False)
    content_type = response.headers.get('Content-Type', '')
    
    if 'text/plain' in content_type or content_type.startswith('text/'):
        response.encoding = 'utf-8'  
        return response.text
    else:
        print(f"Ignoring non-text content (Content-Type: {content_type})")
        return None

def summarize_url(url, sentences_count=SENTENCES_COUNT, language=LANGUAGE, algorithm_id=None):
    if algorithm_id is not None:
        algorithm_index = algorithm_id
    else:
       algorithm_index = 0

    summarizer_class = SUMMARY_ALGORITHMS[algorithm_index]
    summarizer = summarizer_class()
    summarizer.stop_words = get_stop_words(language)

    try:
        try:
            parser = HtmlParser.from_url(url, Tokenizer(language))
        except Exception as e:
            html_content = fetch_page_content(url)
            language = detect_language(html_content)
            tokenizer = Tokenizer('english')
            summarizer.stemmer = Stemmer(language)
            parser = HtmlParser.from_string(html_content, url, tokenizer)

        summary = summarizer(parser.document, sentences_count)

        return " ".join(str(sentence) for sentence in summary).strip("\"")

    except Exception as e:
        return f"Error: {str(e)}"

if len(sys.argv) < 3:
    print("Usage: python summarizer.py <url> <number_of_sentences> [algorithm_id]")
    sys.exit(1)

url = sys.argv[1]
num_sentences = int(sys.argv[2])
algorithm_id = int(sys.argv[3]) if len(sys.argv) > 3 else None

print(summarize_url(url, num_sentences, algorithm_id=algorithm_id))