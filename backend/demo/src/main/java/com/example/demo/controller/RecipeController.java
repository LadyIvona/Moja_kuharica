package com.example.demo.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.model.Recipe;
import com.example.demo.repository.RecipeRepository;

@RestController
@RequestMapping("/api/recipes")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175", "http://127.0.0.1:5175"})
@Tag(name = "Recepti", description = "Ustvarjanje, pregledovanje, urejanje in brisanje receptov")
public class RecipeController {

    private final RecipeRepository recipeRepository;

    public RecipeController(RecipeRepository recipeRepository) {
        this.recipeRepository = recipeRepository;
    }

    @Operation(summary = "Dodaj recept", description = "Shrani nov recept in vrne ustvarjeni zapis.")
    @PostMapping
    public ResponseEntity<Recipe> createRecipe(@RequestBody Recipe recipe) {
        recipe.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(recipeRepository.save(recipe));
    }

    @Operation(summary = "Pridobi vse recepte")
    @GetMapping
    public ResponseEntity<List<Recipe>> getAllRecipes() {
        return ResponseEntity.ok(recipeRepository.findAll());
    }

    @Operation(summary = "Pridobi recept po ID-ju")
    @GetMapping("/{id}")
    public ResponseEntity<Recipe> getRecipeById(@PathVariable Long id) {
        return ResponseEntity.ok(findRecipe(id));
    }

    @Operation(summary = "Posodobi recept po ID-ju")
    @PutMapping("/{id}")
    public ResponseEntity<Recipe> updateRecipe(@PathVariable Long id, @RequestBody Recipe recipeDetails) {
        Recipe recipe = findRecipe(id);
        recipe.setTitle(recipeDetails.getTitle());
        recipe.setDescription(recipeDetails.getDescription());
        recipe.setIngredients(recipeDetails.getIngredients());
        recipe.setInstructions(recipeDetails.getInstructions());
        recipe.setCategory(recipeDetails.getCategory());
        recipe.setCaloriesPer100g(recipeDetails.getCaloriesPer100g());
        recipe.setProteinPer100g(recipeDetails.getProteinPer100g());
        recipe.setFatPer100g(recipeDetails.getFatPer100g());
        recipe.setFiberPer100g(recipeDetails.getFiberPer100g());
        return ResponseEntity.ok(recipeRepository.save(recipe));
    }

    @Operation(summary = "Izbriši recept po ID-ju")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecipe(@PathVariable Long id) {
        recipeRepository.delete(findRecipe(id));
        return ResponseEntity.noContent().build();
    }

    private Recipe findRecipe(Long id) {
        return recipeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recept ne obstaja."));
    }
}
