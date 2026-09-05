#!/system/bin/sh
set -eu
revision=e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f
repo=onnx-community/Florence-2-base-ft
target=${1:-training/wonder-v1/model-cache/florence-2-base-ft-q4}
mkdir -p "$target"
hf download "$repo" --revision "$revision" --local-dir "$target" \
  config.json generation_config.json preprocessor_config.json tokenizer.json tokenizer_config.json vocab.json merges.txt \
  onnx/vision_encoder_q4.onnx onnx/encoder_model_q4.onnx onnx/embed_tokens_q4.onnx onnx/decoder_model_merged_q4.onnx
