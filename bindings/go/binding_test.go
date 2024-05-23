package tree_sitter_magik_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-magik"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_magik.Language())
	if language == nil {
		t.Errorf("Error loading Magik grammar")
	}
}
